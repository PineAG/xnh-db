import { ConfigFlatten, IOfflineClient, IOnlineClient} from "@xnh-db/protocol"
import { FieldConfig as FC } from "@xnh-db/protocol"
import * as idb from "idb"
import { DeepPartial } from "utility-types"
import { extractFullTextTokensByConfig } from "./fulltext"
import { GlobalStatusWrapper, IdbTagWrapper } from "./global"
import {IdbIndexOption, IdbStoreWrapper} from "./wrapper"

export interface FullTextItem {
    keywords: string[]
    weights: Record<string, number>
}

export interface IdbCollectionQuery {
    keyPath: string[]
    value: any
}


type IdbCollectionWrapperDeletionListener = (db: idb.IDBPDatabase, id: string) => Promise<void>

export class IdbCollectionWrapper<T extends FC.EntityBase> {
    deletionListeners: IdbCollectionWrapperDeletionListener[] = []

    private dataWrapper: IdbStoreWrapper<Record<string, any>, string>
    private timeWrapper: IdbStoreWrapper<number, never>
    private fullTextWrapper: IdbStoreWrapper<FullTextItem, "keywords">
    private fullTextTermsWrapper: IdbStoreWrapper<number, never>
    private dirtyWrapper: IdbStoreWrapper<boolean, never>

    constructor(public readonly name: string, private config: FC.ConfigFromDeclaration<T>) {
        const dataIndices: Record<string, IdbIndexOption> = {}
        const configList = ConfigFlatten.flattenConfig(config)
        for(const [path, config] of configList) {
            const isArray = FC.Fields.isArrayEndpoint(config)
            const keyPath = ConfigFlatten.stringifyKeyPath(path)
            dataIndices[keyPath] = {keyPath, isArray, unique: false}
        }
        this.dataWrapper = new IdbStoreWrapper(`entity_${name}:data`, dataIndices)

        this.timeWrapper = new IdbStoreWrapper(`entity_${name}:updatedAt`, {})
        this.fullTextWrapper = new IdbStoreWrapper(`entity_${name}:fullText:documents`, {keywords: {keyPath: "keywords", isArray: true, unique: false}})
        this.fullTextTermsWrapper = new IdbStoreWrapper(`entity_${name}:fullText:terms`, {})
        this.dirtyWrapper = new IdbStoreWrapper(`entity_${name}:dirty`, {})
    }

    onUpgrade(db: idb.IDBPDatabase) {
        this.dataWrapper.initialize(db)
        this.timeWrapper.initialize(db)
        this.fullTextWrapper.initialize(db)
        this.fullTextTermsWrapper.initialize(db)
        this.dirtyWrapper.initialize(db)
    }

    async onLaunch(db: idb.IDBPDatabase) {
        await this.dataWrapper.updateStoreIndices(db)
    }

    async getItem(db: idb.IDBPDatabase, id: string): Promise<DeepPartial<T>> {
        const flat = await this.dataWrapper.get(db, id) as Partial<ConfigFlatten.FlattenedEntity<T>>
        if(!flat) {
            throw new Error(`Not exist: ${this.name}: ${id}`)
        }
        return ConfigFlatten.extractFlatDataByConfig<T>(flat, this.config)
    }

    async putItem(db: idb.IDBPDatabase, id: string, value: DeepPartial<T>): Promise<void> {
        const flat = ConfigFlatten.flattenDataByConfig<T>(value, this.config)
        await this.dataWrapper.put(db, id, flat)
    }

    async deleteItem(db: idb.IDBPDatabase, id: string): Promise<void> {
        await this.dataWrapper.delete(db, id)
        await this.dirtyWrapper.delete(db, id)
    }

    async getAllIndices(db: idb.IDBPDatabase): Promise<[string, Date][]> {
        const keys = await this.timeWrapper.getAllKeys(db)
        return await Promise.all(keys.map(async k => {
            const time = await this.timeWrapper.get(db, k)
            if(!time) {
                throw new Error(`Missing timestamp: ${k}`)
            }
            return [k, new Date(time)] as [string, Date]
        }))
    }

    async flushAllIndices(db: idb.IDBPDatabase, indices: [string, Date][]): Promise<void> {
        await this.timeWrapper.clear(db)
        await Promise.all(indices.map(async ([key, date]) => {
            await this.timeWrapper.put(db, key, date.getTime())
        }))
    }

    async setIndex(db: idb.IDBPDatabase, id: string, updatedAt: Date): Promise<void> {
        await this.timeWrapper.put(db, id, updatedAt.getTime())
    }

    async deleteIndex(db: idb.IDBPDatabase, id: string): Promise<void> {
        await this.timeWrapper.delete(db, id)
    }

    private async getFullText(db: idb.IDBPDatabase, id: string): Promise<FullTextItem | null> {
        const result = await this.fullTextWrapper.get(db, id)
        return result ?? null
    }

    private async updateFullTextTerms(db: idb.IDBPDatabase, terms: Record<string, number>): Promise<void> {
        await Promise.all(Object.keys(terms).map(async term => {
            const weight = terms[term]
            const current: number = await this.fullTextTermsWrapper.get(db, term) ?? 0
            const newValue = current + weight
            if(newValue <= 0) {
                await this.fullTextTermsWrapper.delete(db, term)
            }else {
                await this.fullTextTermsWrapper.put(db, term, newValue)
            }
        }))
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
        await this.fullTextWrapper.put(db, id, newItem)
        await this.updateFullTextTerms(db, newWeights)
    }

    async deleteFullText(db: idb.IDBPDatabase, id: string): Promise<void> {
        const currentIndex = await this.getFullText(db, id)
        if(currentIndex) {
            const weights = currentIndex.weights
            for(const w of Object.keys(weights)){
                weights[w] = -weights[w]
            }
            await this.updateFullTextTerms(db, weights)
        }
        await this.fullTextWrapper.delete(db, id)
    }

    async queryByField(db: idb.IDBPDatabase, keys: string[], value: any): Promise<string[]> {
        const results = await this.dataWrapper.getKeysByIndex(db, ConfigFlatten.stringifyKeyPath(keys), value)
        return results
    }

    async queryFullText(db: idb.IDBPDatabase, keyword: string): Promise<IOnlineClient.FullTextQueryResult[]> {
        const keys = await this.fullTextWrapper.getKeysByIndex(db, "keywords", keyword)
        return await Promise.all(keys.map(async id => {
            const item = await this.fullTextWrapper.get(db, id)
            const termFreq = await this.fullTextTermsWrapper.get(db, keyword) ?? 0
            if(!item) {
                throw new Error(`Not exist: ${id}`)
            }
            const weight = item.weights[keyword] * Math.log(termFreq + 1)
            return {id, weight}
        }))
    }

    async emitDeletion(db: idb.IDBPDatabase, id: string) {
        return Promise.all(this.deletionListeners.map(it => it(db, id)))
    }

    onDelete(listener: IdbCollectionWrapperDeletionListener) {
        this.deletionListeners.push(listener)
    }

    setCollectionStatus(db: idb.IDBPDatabase, status: IOfflineClient.LatestStatus): Promise<void> {
        return GlobalStatusWrapper.setCollectionStatus(db, this.name, status)
    }

    getCollectionStatus(db: idb.IDBPDatabase): Promise<IOfflineClient.LatestStatus> {
        return GlobalStatusWrapper.getCollectionStatus(db, this.name)
    }

    async updateTags(db: idb.IDBPDatabase, data: DeepPartial<T>): Promise<void> {
        await IdbTagWrapper.putTagsByConfig(db, data, this.config)
    }

    async getFullTextKeysByPrefix(db: idb.IDBPDatabase, prefix: string, count: number): Promise<string[]> {
        return this.fullTextTermsWrapper.queryKeys(db, IDBKeyRange.lowerBound(prefix), count)
    }

    async markDirty(db: idb.IDBPDatabase, id: string, isDirty: boolean) {
        if(isDirty) {
            await this.dirtyWrapper.put(db, id, true)
        } else {
            await this.dirtyWrapper.delete(db, id)
        }
    }

    async clearDirty(db: idb.IDBPDatabase) {
        const idList = await this.dirtyWrapper.getAllKeys(db)
        for(const id of idList) {
            await this.deleteItem(db, id)
        }
    }

}

export class IdbCollectionOnlineClient<T extends FC.EntityBase> implements IOnlineClient.Collection<T, IdbCollectionQuery> {
    constructor(private dbFactory: () => Promise<idb.IDBPDatabase>, private wrapper: IdbCollectionWrapper<T>) {
    }

    private async withDB<R>(cb: (db: idb.IDBPDatabase) => Promise<R>): Promise<R> {
        const db = await this.dbFactory()
        const result = await cb(db)
        db.close()
        return result
    }

    getItemById(id: string): Promise<DeepPartial<T>> {
        return this.withDB(db => {
            return this.wrapper.getItem(db, id)
        })
    }
    queryItems(query: IdbCollectionQuery): Promise<string[]> {
        return this.withDB(db => {
            return this.wrapper.queryByField(db, query.keyPath, query.value)
        })
    }

    queryFullText(keyword: string): Promise<IOnlineClient.FullTextQueryResult[]> {
        return this.withDB(db => {
            return this.wrapper.queryFullText(db, keyword)
        })
    }
    async putItem(id: string, value: DeepPartial<T>): Promise<void> {
        await this.withDB(async db => {
            const updatedAt = new Date()
            await this.wrapper.putItem(db, id, value)
            await this.wrapper.putFullText(db, id, value)
            await this.wrapper.setIndex(db, id, updatedAt)
            await this.wrapper.setCollectionStatus(db, {updatedAt})
            await this.wrapper.updateTags(db, value)
        })
    }
    async deleteItem(id: string): Promise<void> {
        await this.withDB(async db => {
            await this.wrapper.emitDeletion(db, id)
            await this.wrapper.deleteIndex(db, id)
            await this.wrapper.deleteFullText(db, id)
            await this.wrapper.setCollectionStatus(db, {updatedAt: new Date()})
        })
    }
    
    autocompleteFullText(prefix: string, limit: number): Promise<string[]> {
        return this.withDB(async db => {
            return this.wrapper.getFullTextKeysByPrefix(db, prefix, limit)
        })
    }

    markDirtyItem(id: string, isDirty: boolean): Promise<void> {
        return this.withDB(async db => {
            await this.wrapper.markDirty(db, id, isDirty)
        })
    }
    
    clearDirtyItem(): Promise<void> {
        return this.withDB(async db => {
            await this.wrapper.clearDirty(db)
        })
    }
}

export class IdbCollectionOfflineClient<T extends FC.EntityBase> implements IOfflineClient.Collection<T> {
    constructor(private dbFactory: () => Promise<idb.IDBPDatabase>, private wrapper: IdbCollectionWrapper<T>) {
    }

    private async withDB<R>(cb: (db: idb.IDBPDatabase) => Promise<R>): Promise<R> {
        const db = await this.dbFactory()
        const result = await cb(db)
        db.close()
        return result
    }

    getStatus(): Promise<IOfflineClient.LatestStatus> {
        return this.withDB(async db => {
            return this.wrapper.getCollectionStatus(db)
        })
    }
    setStatus(status: IOfflineClient.LatestStatus): Promise<void> {
        return this.withDB(async db => {
            return this.wrapper.setCollectionStatus(db, status)
        })
    }
    async getIndex(): Promise<IOfflineClient.CollectionIndex<string>> {
        return this.withDB(async db => {
            const indices = await this.wrapper.getAllIndices(db)
            return indices.map(([key, date]) => ({key, date}))
        })
    }
    flushIndex(index: IOfflineClient.CollectionIndex<string>): Promise<void> {
        return this.withDB(async db => {
            const list = index.map(({key, date}) => [key, date] as [string, Date])
            return this.wrapper.flushAllIndices(db, list)
        })
    }
    getItem(id: string): Promise<DeepPartial<T>> {
        return this.withDB(async db => {
            return this.wrapper.getItem(db, id)
        })
    }
    async updateItem(id: string, value: DeepPartial<T>): Promise<void> {
        return this.withDB(async db => {
            await this.wrapper.putItem(db, id, value)
            await this.wrapper.putFullText(db, id, value)
            await this.wrapper.updateTags(db, value)
        })
    }
    async deleteItem(id: string): Promise<void> {
        return this.withDB(async db => {    
            await this.wrapper.emitDeletion(db, id)
            await this.wrapper.deleteIndex(db, id)
            await this.wrapper.deleteFullText(db, id)
        })
    }
}
