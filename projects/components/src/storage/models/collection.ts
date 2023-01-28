import { flattenDataDefinition, IOfflineClient, IOnlineClient, keyPathToFlattenedKey, extractFlatDataByConfig, flattenDataByConfig } from "@xnh-db/protocol"
import { FieldConfig as FC } from "@xnh-db/protocol"
import * as idb from "idb"
import { sortBy } from "lodash"
import { DeepPartial } from "utility-types"
import { extractFullTextTokensByConfig } from "./fulltext"
import { GlobalStatusWrapper } from "./global"
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

export class IdbCollectionWrapper<T> {
    deletionListeners: IdbCollectionWrapperDeletionListener[] = []

    private dataWrapper: IdbStoreWrapper<Record<string, any>, string>
    private timeWrapper: IdbStoreWrapper<Date, never>
    private fullTextWrapper: IdbStoreWrapper<FullTextItem, "keywords">
    private fullTextTermsWrapper: IdbStoreWrapper<number, never>

    constructor(public readonly name: string, private config: FC.ConfigFromDeclaration<T>) {
        const dataIndices: Record<string, IdbIndexOption> = {}
        const configList = flattenDataDefinition(config)
        for(const [path, config] of configList) {
            const isArray = config.type !== "id" && config.isArray
            const keyPath = keyPathToFlattenedKey(path)
            dataIndices[keyPath] = {keyPath, isArray, unique: false}
        }
        this.dataWrapper = new IdbStoreWrapper(`${name}:data`, dataIndices)

        this.timeWrapper = new IdbStoreWrapper(`${name}:updatedAt`, {})
        this.fullTextWrapper = new IdbStoreWrapper(`${name}:fullText:documents`, {keywords: {keyPath: "keywords", isArray: true, unique: false}})
        this.fullTextTermsWrapper = new IdbStoreWrapper(`${name}:fullText:terms`, {})

    }

    onUpgrade(db: idb.IDBPDatabase) {
        this.dataWrapper.initialize(db)
        this.timeWrapper.initialize(db)
        this.fullTextWrapper.initialize(db)
        this.fullTextTermsWrapper.initialize(db)
    }

    async getItem(db: idb.IDBPDatabase, id: string): Promise<DeepPartial<T>> {
        const flat = await this.dataWrapper.get(db, id)
        if(!flat) {
            throw new Error(`Not exist: ${this.name}: ${id}`)
        }
        return extractFlatDataByConfig(flat, this.config)
    }

    async putItem(db: idb.IDBPDatabase, id: string, value: DeepPartial<T>): Promise<void> {
        const flat = flattenDataByConfig<T>(value, this.config)
        await this.dataWrapper.put(db, id, flat)
    }

    async deleteItem(db: idb.IDBPDatabase, id: string): Promise<void> {
        await this.dataWrapper.delete(db, id)
    }

    async getAllIndices(db: idb.IDBPDatabase): Promise<[string, Date][]> {
        const keys = await this.timeWrapper.getAllKeys(db)
        return await Promise.all(keys.map(async k => {
            const time = await this.timeWrapper.get(db, k)
            return [k, time] as [string, Date]
        }))
    }

    async flushAllIndices(db: idb.IDBPDatabase, indices: [string, Date][]): Promise<void> {
        await this.timeWrapper.clear(db)
        await Promise.all(indices.map(async ([key, date]) => {
            await this.timeWrapper.put(db, key, date)
        }))
    }

    async setIndex(db: idb.IDBPDatabase, id: string, updatedAt: Date): Promise<void> {
        await this.timeWrapper.put(db, id, updatedAt)
    }

    async deleteIndex(db: idb.IDBPDatabase, id: string): Promise<void> {
        await this.timeWrapper.delete(db, id)
    }

    private async getFullText(db: idb.IDBPDatabase, id: string): Promise<FullTextItem | null> {
        const result = await this.fullTextWrapper.get(db, id)
        return result
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

    async queryByField(db: idb.IDBPDatabase, keys: string[], value: any): Promise<DeepPartial<T>[]> {
        const flatList = await this.dataWrapper.getAllByIndex(db, keyPathToFlattenedKey(keys), value)
        return flatList.map(flat => extractFlatDataByConfig(flat, this.config))
    }

    async queryFullText(db: idb.IDBPDatabase, keywords: string[]): Promise<IOnlineClient.FullTextQueryResult[]> {
        const resultByKeyword = await Promise.all(keywords.map(async keyword => {
            const keys = await this.fullTextWrapper.getKeysByIndex(db, "keywords", keyword)
            const result: Record<string, number> = {}
            await Promise.all(keys.map(async id => {
                const item = await this.fullTextWrapper.get(db, id)
                const termFreq = await this.fullTextTermsWrapper.get(db, keyword) ?? 0
                
                const weight = item.weights[keyword] * Math.log(termFreq + 1)
                result[id] = weight
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

    setCollectionStatus(db: idb.IDBPDatabase, status: IOfflineClient.LatestStatus): Promise<void> {
        return GlobalStatusWrapper.setCollectionStatus(db, this.name, status)
    }

    getCollectionStatus(db: idb.IDBPDatabase): Promise<IOfflineClient.LatestStatus> {
        return GlobalStatusWrapper.getCollectionStatus(db, this.name)
    }

}

export class IdbCollectionOnlineClient<T> implements IOnlineClient.Collection<T, IdbCollectionQuery> {
    constructor(private db: idb.IDBPDatabase, private wrapper: IdbCollectionWrapper<T>) {

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
    async putItem(id: string, value: DeepPartial<T>): Promise<void> {
        const updatedAt = new Date()
        await this.wrapper.putItem(this.db, id, value)
        await this.wrapper.putFullText(this.db, id, value)
        await this.wrapper.setIndex(this.db, id, updatedAt)
        await this.wrapper.setCollectionStatus(this.db, {updatedAt})
    }
    async deleteItem(id: string): Promise<void> {
        await this.wrapper.emitDeletion(this.db, id)
        await this.wrapper.deleteIndex(this.db, id)
        await this.wrapper.deleteFullText(this.db, id)
        await this.wrapper.setCollectionStatus(this.db, {updatedAt: new Date()})
    }
}

export class IdbCollectionOfflineClient<T> implements IOfflineClient.Collection<T> {
    constructor(private db: idb.IDBPDatabase, private wrapper: IdbCollectionWrapper<T>) {

    }
    getStatus(): Promise<IOfflineClient.LatestStatus> {
        return this.wrapper.getCollectionStatus(this.db)
    }
    setStatus(status: IOfflineClient.LatestStatus): Promise<void> {
        throw this.wrapper.setCollectionStatus(this.db, status)
    }
    async getIndex(): Promise<IOfflineClient.CollectionIndex<string>> {
        const indices = await this.wrapper.getAllIndices(this.db)
        return indices.map(([key, date]) => ({key, date}))
    }
    flushIndex(index: IOfflineClient.CollectionIndex<string>): Promise<void> {
        const list = index.map(({key, date}) => [key, date] as [string, Date])
        return this.wrapper.flushAllIndices(this.db, list)
    }
    getItem(id: string): Promise<DeepPartial<T>> {
        return this.wrapper.getItem(this.db, id)
    }
    async updateItem(id: string, value: DeepPartial<T>): Promise<void> {
        await this.wrapper.putItem(this.db, id, value)
        await this.wrapper.putFullText(this.db, id, value)
    }
    async deleteItem(id: string): Promise<void> {
        await this.wrapper.emitDeletion(this.db, id)
        await this.wrapper.deleteIndex(this.db, id)
        await this.wrapper.deleteFullText(this.db, id)
    }
}
