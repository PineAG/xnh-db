import { flattenDataDefinition, IOfflineClient, IOnlineClient, keyPathToFlattenedKey, extractFlatDataByConfig, flattenDataByConfig } from "@xnh-db/protocol"
import { FieldConfig as FC } from "@xnh-db/protocol"
import * as idb from "idb"
import { sortBy } from "lodash"
import { DeepPartial } from "utility-types"
import { extractFullTextTokensByConfig } from "./fulltext"

export interface FullTextItem {
    keywords: string[]
    weights: Record<string, number>
}

export interface IdbCollectionQuery {
    keyPath: string[]
    value: any
}

export module GlobalStatusWrapper {
    async function transaction<Mode extends IDBTransactionMode, R>(db: idb.IDBPDatabase, mode: Mode, cb: (store: idb.IDBPObjectStore<any, any, any, Mode>) => Promise<R>): Promise<R> {
        const tx = db.transaction("sync_state", mode)
        const result = await cb(tx.store)
        await tx.done
        return result
    }

    export function initialize(db: idb.IDBPDatabase) {
        db.createObjectStore("sync_state")   
    }

    const DIRTY_NAME = "is_dirty"

    export function isDirty(db: idb.IDBPDatabase): Promise<boolean> {
        return transaction(db, "readonly", async (store) => {
            return await store.get(DIRTY_NAME) ?? true
        })
    }

    export function setDirty(db: idb.IDBPDatabase, value: boolean): Promise<void> {
        return transaction(db, "readwrite", async store => {
            await store.put(value, DIRTY_NAME)
        })
    }
}

type IdbCollectionWrapperDeletionListener = (db: idb.IDBPDatabase, id: string) => Promise<void>

export class IdbCollectionWrapper<T> {
    deletionListeners: IdbCollectionWrapperDeletionListener[] = []

    constructor(public readonly name: string, private config: FC.ConfigFromDeclaration<T>) {}

    onUpgrade(db: idb.IDBPDatabase) {
        const store = db.createObjectStore(this.name, {autoIncrement: false})
        const configList = flattenDataDefinition(this.config)
        for(const [path, config] of configList) {
            const isArray = config.type !== "id" && config.isArray
            store.createIndex(this.dataIndexName(path), this.dataKeyPath(path), {multiEntry: isArray, unique: false})
        }

        db.createObjectStore(this.indexStoreName())

        const fullTextStore = db.createObjectStore(this.fullTextStoreName())
        fullTextStore.createIndex(this.fullTextIndexName(), this.fullTextIndexKeyPath(), {multiEntry: true, unique: false})

        db.createObjectStore(this.fullTextTermStoreName())
    }

    private dataIndexName(key: string[]): string {
        return `${key.join("_")}`
    }

    private dataKeyPath(key: string[]): string {
        return keyPathToFlattenedKey(key)
    }

    private fullTextStoreName(): string {
        return `${this.name}:fullText:document`
    }

    private fullTextTermStoreName(): string {
        return `${this.name}:fullText:term`
    }

    private fullTextIndexName(): string {
        return "keywords"
    }

    private fullTextIndexKeyPath(): string {
        return "keywords"
    }

    private indexStoreName(): string {
        return `${this.name}:index`
    }

    private async transaction<Mode extends IDBTransactionMode, R>(db: idb.IDBPDatabase, mode: Mode, cb: (store: idb.IDBPObjectStore<any, any, any, Mode>) => Promise<R>): Promise<R> {
        const tx = db.transaction(this.name, mode)
        const result = await cb(tx.store)
        await tx.done
        return result
    }

    getItem(db: idb.IDBPDatabase, id: string): Promise<DeepPartial<T>> {
        return this.transaction(db, "readonly", async (store) => {
            const result: Record<string, any> = await store.get(id)
            if(!result) {
                throw new Error(`Not exist: ${this.name}: ${id}`)
            }
            return extractFlatDataByConfig(result, this.config)
        })
    }

    async putItem(db: idb.IDBPDatabase, id: string, value: DeepPartial<T>): Promise<void> {
        const flatValue = flattenDataByConfig<T>(value, this.config)
        await this.transaction(db, "readwrite", async (store) => {
            await store.put(flatValue, id)
        })
        await GlobalStatusWrapper.setDirty(db, true)
    }

    async deleteItem(db: idb.IDBPDatabase, id: string): Promise<void> {
        await this.transaction(db, "readwrite", async (store) => {
            await store.delete(id)
        })
    }

    private async indexTransaction<Mode extends IDBTransactionMode, R>(db: idb.IDBPDatabase, mode: Mode, cb: (store: idb.IDBPObjectStore<any, any, any, Mode>) => Promise<R>): Promise<R> {
        const tx = db.transaction(this.indexStoreName(), mode)
        const result = await cb(tx.store)
        await tx.done
        return result
    }

    getAllIndices(db: idb.IDBPDatabase): Promise<[string, Date][]> {
        return this.indexTransaction(db, "readonly", async store => {
            const keys = await store.getAllKeys()
            return await Promise.all(keys.map(async k => {
                return [k, await store.get(k)] as [string, Date]
            }))
        })
    }

    setIndex(db: idb.IDBPDatabase, id: string, updatedAt: Date): Promise<void> {
        return this.indexTransaction(db, "readwrite", async store => {
            store.put(updatedAt, id)
        })
    }

    deleteIndex(db: idb.IDBPDatabase, id: string): Promise<void> {
        return this.indexTransaction(db, "readwrite", async store => {
            store.delete(id)
        })
    }

    private async fullTextTransaction<Mode extends IDBTransactionMode, R>(db: idb.IDBPDatabase, mode: Mode, cb: (docStore: idb.IDBPObjectStore<any, any, any, Mode>, termStore: idb.IDBPObjectStore<any, any, any, Mode>) => Promise<R>): Promise<R> {
        const docTx = db.transaction(this.fullTextStoreName(), mode)
        const termTx = db.transaction(this.fullTextTermStoreName(), mode)
        const result = await cb(docTx.store, termTx.store)
        await Promise.all([docTx.done, termTx.done])
        return result
    }

    private async getFullText(db: idb.IDBPDatabase, id: string): Promise<FullTextItem | null> {
        const docTx = db.transaction(this.fullTextStoreName(), "readonly")
        const result = docTx.store.get(id)
        await docTx.done
        return result
    }

    private async updateFullTextTerms(db: idb.IDBPDatabase, terms: Record<string, number>): Promise<void> {
        const tx = db.transaction(this.fullTextTermStoreName(), "readwrite")
        await Promise.all(Object.keys(terms).map(async term => {
            const weight = terms[term]
            const current: number = await tx.store.get(term) ?? 0
            const newValue = current + weight
            if(newValue <= 0) {
                await tx.store.delete(term)
            }else {
                await tx.store.put(newValue, term)
            }
        }))
        await tx.done
    }

    async putFullText(db: idb.IDBPDatabase, id: string, data: DeepPartial<T>): Promise<void> {
        const oldIdx = await this.getFullText(db, id)
        const oldWeights = oldIdx?.weights ?? {}
        const weights = extractFullTextTokensByConfig<T>(data, this.config)
        const newWeights = {...weights}
        for(const w of Object.keys(oldWeights)) {
            newWeights[w] = (newWeights[w] ?? 0) - oldWeights[w]
        }
        const newItem: FullTextItem = {
            keywords: Array.from(Object.keys(weights)),
            weights
        }
        await this.fullTextTransaction(db, "readwrite", async (doc, term) => {
            doc.put(newItem, id)
        })
        await this.updateFullTextTerms(db, newWeights)
    }

    async deleteFullText(db: idb.IDBPDatabase, id: string): Promise<void> {
        const currentIndex = await this.getFullText(db, id)
        return this.fullTextTransaction(db, "readwrite", async (doc, term) => {
            if(currentIndex) {
                const weights = currentIndex.weights
                for(const w of Object.keys(weights)){
                    weights[w] = -weights[w]
                }
                await this.updateFullTextTerms(db, weights)
            }
            await doc.delete(id)
        })
    }

    async queryByField(db: idb.IDBPDatabase, keys: string[], value: any): Promise<DeepPartial<T>[]> {
        const tx = db.transaction(this.name, "readonly")
        console.log(tx.store.indexNames, this.dataIndexName(keys), tx.store.indexNames.contains(this.dataIndexName(keys)), value)
        const result = await tx.db.getAllFromIndex(this.name, this.dataIndexName(keys), value)
        await tx.done
        return result
    }

    async queryFullText(db: idb.IDBPDatabase, keywords: string[]): Promise<IOnlineClient.FullTextQueryResult[]> {
        const resultByKeyword = await Promise.all(keywords.map(async keyword => {
            const keys = await db.getAllKeysFromIndex(this.fullTextStoreName(), this.fullTextIndexName(), keyword)
            const result: Record<string, number> = {}
            await Promise.all(keys.map(async id => {
                const tx = db.transaction(this.fullTextStoreName(), "readonly")
                const item: FullTextItem = await tx.store.get(id)
                await tx.done
                
                const termTx = db.transaction(this.fullTextTermStoreName(), "readonly")
                const termFreq = await termTx.store.get(keyword) ?? 0
                await termTx.done
                
                const weight = item.weights[keyword] * Math.log(termFreq + 1)
                result[id as string] = weight
            }))
            return result
        }))
        const finalResult = resultByKeyword.reduce((left, right) => {
            const result: Record<string, number> = {}
            for(const k of Object.keys(left)) {
                if(k in right) {
                    result[k] = left[k] + right[k]
                }
            }
            return result
        })
        const list = Array.from(Object.entries(finalResult)).map(([id, weight]) => ({id, weight}))
        return sortBy(list, it => -it.weight)
    }

    async emitDeletion(db: idb.IDBPDatabase, id: string) {
        return Promise.all(this.deletionListeners.map(it => it(db, id)))
    }

    onDelete(listener: IdbCollectionWrapperDeletionListener) {
        this.deletionListeners.push(listener)
    }

}

export class IdbCollectionClient<T> implements IOnlineClient.Collection<T, IdbCollectionQuery>, IOfflineClient.Collection<T> {
    constructor(private db: idb.IDBPDatabase, private wrapper: IdbCollectionWrapper<T>) {

    }
    async getIndex(): Promise<IOfflineClient.CollectionIndex<string>> {
        const indices = await this.wrapper.getAllIndices(this.db)
        return indices.map(([key, date]) => ({key, date}))
    }
    getItem(id: string): Promise<DeepPartial<T>> {
        return this.wrapper.getItem(this.db, id)
    }
    async updateItem(id: string, value: DeepPartial<T>, updatedAt: Date): Promise<void> {
        await this.wrapper.putItem(this.db, id, value)
        await this.wrapper.putFullText(this.db, id, value)
        await this.wrapper.setIndex(this.db, id, updatedAt)
    }

    getItemById(id: string): Promise<DeepPartial<T>> {
        return this.wrapper.getItem(this.db, id)
    }
    queryItems(query: IdbCollectionQuery): Promise<DeepPartial<T>[]> {
        return this.wrapper.queryByField(this.db, query.keyPath, query.value)
    }
    queryFullText(keywords: string[]): Promise<IOnlineClient.FullTextQueryResult[]> {
        return this.wrapper.queryFullText(this.db, keywords)
    }
    async putItem(id: string, value: DeepPartial<T>, updatedAt: Date): Promise<void> {
        await this.wrapper.putItem(this.db, id, value)
        await this.wrapper.putFullText(this.db, id, value)
        await this.wrapper.setIndex(this.db, id, updatedAt)
    }
    async deleteItem(id: string): Promise<void> {
        await this.wrapper.emitDeletion(this.db, id)
        await this.wrapper.deleteIndex(this.db, id)
        await this.wrapper.deleteFullText(this.db, id)
        await this.wrapper.deleteFullText(this.db, id)
    }
}
