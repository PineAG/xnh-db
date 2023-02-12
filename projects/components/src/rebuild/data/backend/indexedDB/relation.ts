import { IOfflineClient, IOnlineClient, FieldConfig as FC } from "@xnh-db/protocol"
import * as idb from "idb"
import { DeepPartial } from "utility-types"
import { IdbCollectionWrapper } from "./collection"
import { GlobalStatusWrapper, IdbTagWrapper } from "./global"
import { IdbIndexOption, IdbStoreWrapper } from "./wrapper"

export class IdbRelationWrapper<C extends Record<string, any>, Payload extends FC.EntityBase> {
    readonly storeName: string
    readonly sortedKeys: string[]

    private relationWrapper: IdbStoreWrapper<Record<keyof C, string>, keyof C & string>
    private timeWrapper: IdbStoreWrapper<number, never>
    private payloadWrapper: IdbStoreWrapper<DeepPartial<Payload>, never>

    constructor(wrappers: {[K in keyof C]: IdbCollectionWrapper<C[K]>}, private config: FC.ConfigFromDeclaration<Payload>) {
        for(const key in wrappers) {
            const wrapper = wrappers[key]
            wrapper.onDelete((db, id) => {
                return this.deleteRelationByKey(db, key, id)
            })
        }

        const sortedKeys = Array.from(Object.keys(wrappers))
        sortedKeys.sort()
        this.sortedKeys = sortedKeys

        this.storeName = `relation_${sortedKeys.map(k => `${k}=${wrappers[k].name}`).join("_")}`

        const relationIndices: Partial<Record<keyof C, IdbIndexOption>> = {}
        for(const key in wrappers) {
            relationIndices[key] = {keyPath: key, isArray: false, unique: false}
        }
        this.relationWrapper = new IdbStoreWrapper(`${this.storeName}:relations`, relationIndices)

        this.timeWrapper = new IdbStoreWrapper(`${this.storeName}:index`, {})
        this.payloadWrapper = new IdbStoreWrapper(`${this.storeName}:payload`, {})
    }

    onUpgrade(db: idb.IDBPDatabase) {
        this.relationWrapper.initialize(db)
        this.timeWrapper.initialize(db)
        this.payloadWrapper.initialize(db)
    }

    private extractId(keys: Record<keyof C, string>) {
        return this.sortedKeys.map(k => keys[k]).join("_")
    }

    async deleteRelationByKey(db: idb.IDBPDatabase, name: Extract<keyof C, string>, id: string) {
        const keys = await this.relationWrapper.getKeysByIndex(db, name, id)
        await Promise.all(keys.map(async k => {
            await this.relationWrapper.delete(db, k)
            await this.timeWrapper.delete(db, k)
            await this.payloadWrapper.delete(db, k)
        }))
    }

    async getPayload(db: idb.IDBPDatabase, keys: Record<keyof C, string>): Promise<DeepPartial<Payload>> {
        const id = this.extractId(keys)
        const payload  = await this.payloadWrapper.get(db, id)
        if(!payload) {
            throw new Error(`Not found: ${this.storeName}: ${JSON.stringify(keys)}`)
        }
        return payload
    }

    async putRelation(db: idb.IDBPDatabase, keys: Record<keyof C, string>, payload: DeepPartial<Payload>) {
        const id = this.extractId(keys)
        await this.payloadWrapper.put(db, id, payload)
        await this.relationWrapper.put(db, id, keys)
    }

    async getRelationsByKey<K extends Extract<keyof C, string>>(db: idb.IDBPDatabase, key: K, id: string): Promise<Record<Extract<keyof C, string>, string>[]> {
        return this.relationWrapper.getAllByIndex(db, key, id)
    }

    async putDate(db: idb.IDBPDatabase, keys: Record<keyof C, string>, updatedAt: Date) {
        const id = this.extractId(keys)
        await this.timeWrapper.put(db, id, updatedAt.getTime())
    }

    async deleteRelation(db: idb.IDBPDatabase, keys: Record<keyof C, string>) {
        const id = this.extractId(keys)
        await this.relationWrapper.delete(db, id)
        await this.payloadWrapper.delete(db, id)
        await this.timeWrapper.delete(db, id)
    }

    async getIndex(db: idb.IDBPDatabase): Promise<IOfflineClient.CollectionIndex<Record<keyof C, string>>> {
        const keys = await this.timeWrapper.getAllKeys(db)
        return await Promise.all(keys.map(async k => {
            const [key, date] = await Promise.all([
                this.relationWrapper.get(db, k), 
                this.timeWrapper.get(db, k)
            ])
            return {key, date: new Date(date)}
        }))
    }

    async flushIndex(db: idb.IDBPDatabase, indices: IOfflineClient.CollectionIndex<Record<keyof C, string>>) {
        await this.timeWrapper.clear(db)
        await Promise.all(indices.map(async ({key, date}) => {
            const id = this.extractId(key)
            await this.timeWrapper.put(db, id, date.getTime())
        }))
    }

    setCollectionStatus(db: idb.IDBPDatabase, status: IOfflineClient.LatestStatus): Promise<void> {
        return GlobalStatusWrapper.setCollectionStatus(db, this.storeName, status)
    }

    getCollectionStatus(db: idb.IDBPDatabase): Promise<IOfflineClient.LatestStatus> {
        return GlobalStatusWrapper.getCollectionStatus(db, this.storeName)
    }

    async updateTags(db: idb.IDBPDatabase, data: DeepPartial<Payload>): Promise<void> {
        await IdbTagWrapper.putTagsByConfig(db, data, this.config)
    }
}

export class IdbRelationOnlineClient<C extends Record<string, any>, Payload extends FC.EntityBase> implements IOnlineClient.Relation<Extract<keyof C, string>, Payload> {
    constructor(private dbFactory: () => Promise<idb.IDBPDatabase>, private wrapper: IdbRelationWrapper<C, Payload>) {
    }
    private async withDB<R>(cb: (db: idb.IDBPDatabase) => Promise<R>): Promise<R> {
        const db = await this.dbFactory()
        const result = await cb(db)
        db.close()
        return result
    }

    getRelationsByKey<K extends Extract<keyof C, string>>(key: K, id: string): Promise<Record<Extract<keyof C, string>, string>[]> {
        return this.withDB(db => {
            return this.wrapper.getRelationsByKey(db, key, id)
        })
    }
    getPayload(keys: Record<keyof C, string>): Promise<DeepPartial<Payload>> {
        return this.withDB(db => {
            return this.wrapper.getPayload(db, keys)
        })
    }
    async putRelation(keys: Record<keyof C, string>, payload: DeepPartial<Payload>): Promise<void> {
        return this.withDB(async db => {    
            const updatedAt = new Date()
            await this.wrapper.putRelation(db, keys, payload)
            await this.wrapper.putDate(db, keys, updatedAt)
            await this.wrapper.setCollectionStatus(db, {updatedAt})
            await this.wrapper.updateTags(db, payload as DeepPartial<Payload>)
        })
    }
    deleteRelation(keys: Record<keyof C, string>): Promise<void> {
        return this.withDB(async db => {
            return this.wrapper.deleteRelation(db, keys)
        })
    }
}

export class IdbRelationOfflineClient<C extends Record<string, any>, Payload extends FC.EntityBase> implements IOfflineClient.Relation<keyof C & string, Payload> {
    constructor(private dbFactory: () => Promise<idb.IDBPDatabase>, private wrapper: IdbRelationWrapper<C, Payload>) {
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
    getPayload(keys: Record<keyof C, string>): Promise<DeepPartial<Payload>> {
        return this.withDB(async db => {
            return this.wrapper.getPayload(db, keys)
        })
    }
    deleteRelation(keys: Record<keyof C, string>): Promise<void> {
        return this.withDB(async db => {
            return this.wrapper.deleteRelation(db, keys)
        })
    }
    getIndex(): Promise<IOfflineClient.CollectionIndex<Record<keyof C, string>>> {
        return this.withDB(async db => {
            return this.wrapper.getIndex(db)
        })
    }
    flushIndex(index: IOfflineClient.CollectionIndex<Record<keyof C, string>>): Promise<void> {
        return this.withDB(async db => {
            return this.wrapper.flushIndex(db, index)
        })
    }
    async updateRelation(keys: Record<keyof C, string>, payload: DeepPartial<Payload>): Promise<void> {
        return this.withDB(async db => {
            await this.wrapper.putRelation(db, keys, payload)
            await this.wrapper.updateTags(db, payload as DeepPartial<Payload>)
        })
    }
}
