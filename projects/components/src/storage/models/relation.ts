import { IOfflineClient, IOnlineClient } from "@xnh-db/protocol"
import * as idb from "idb"
import { IdbCollectionWrapper } from "./collection"
import { IdbIndexOption, IdbStoreWrapper } from "./wrapper"

export class IdbRelationWrapper<C extends Record<string, any>, Payload> {
    readonly storeName: string
    readonly sortedKeys: string[]

    private relationWrapper: IdbStoreWrapper<Record<keyof C, string>, keyof C & string>
    private timeWrapper: IdbStoreWrapper<Date, never>
    private payloadWrapper: IdbStoreWrapper<Payload, never>

    constructor(wrappers: {[K in keyof C]: IdbCollectionWrapper<C[K]>}) {
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

    async getPayload(db: idb.IDBPDatabase, keys: Record<keyof C, string>): Promise<Payload> {
        const id = this.extractId(keys)
        const payload  = await this.payloadWrapper.get(db, id)
        if(!payload) {
            throw new Error(`Not found: ${this.storeName}: ${JSON.stringify(keys)}`)
        }
        return payload
    }

    async putRelation(db: idb.IDBPDatabase, keys: Record<keyof C, string>, payload: Payload) {
        const id = this.extractId(keys)
        await this.payloadWrapper.put(db, id, payload)
        await this.relationWrapper.put(db, id, keys)
    }

    async putDate(db: idb.IDBPDatabase, keys: Record<keyof C, string>, updatedAt: Date) {
        const id = this.extractId(keys)
        await this.timeWrapper.put(db, id, updatedAt)
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
            return {key, date}
        }))
    }

    async flushIndex(db: idb.IDBPDatabase, indices: IOfflineClient.CollectionIndex<Record<keyof C, string>>) {
        await this.timeWrapper.clear(db)
        await Promise.all(indices.map(async ({key, date}) => {
            const id = this.extractId(key)
            await this.timeWrapper.put(db, id, date)
        }))
    }

}

export class IdbRelationOnlineClient<C extends Record<string, any>, Payload> implements IOnlineClient.Relation<keyof C & string, Payload> {
    constructor(private db: idb.IDBPDatabase, private wrapper: IdbRelationWrapper<C, Payload>) {
    }
    getPayload(keys: Record<keyof C, string>): Promise<Payload> {
        return this.wrapper.getPayload(this.db, keys)
    }
    async putRelation(keys: Record<keyof C, string>, payload: Payload, updatedAt: Date): Promise<void> {
        await this.wrapper.putRelation(this.db, keys, payload)
        await this.wrapper.putDate(this.db, keys, updatedAt)
    }
    deleteRelation(keys: Record<keyof C, string>): Promise<void> {
        return this.wrapper.deleteRelation(this.db, keys)
    }
}

export class IdbRelationOfflineClient<C extends Record<string, any>, Payload> implements IOfflineClient.Relation<keyof C & string, Payload> {
    constructor(private db: idb.IDBPDatabase, private wrapper: IdbRelationWrapper<C, Payload>) {
    }
    getPayload(keys: Record<keyof C, string>): Promise<Payload> {
        return this.wrapper.getPayload(this.db, keys)
    }
    deleteRelation(keys: Record<keyof C, string>): Promise<void> {
        return this.wrapper.deleteRelation(this.db, keys)
    }
    getIndex(): Promise<IOfflineClient.CollectionIndex<Record<keyof C, string>>> {
        return this.wrapper.getIndex(this.db)
    }
    flushIndex(index: IOfflineClient.CollectionIndex<Record<keyof C, string>>): Promise<void> {
        return this.wrapper.flushIndex(this.db, index)
    }
    async updateRelation(keys: Record<keyof C, string>, payload: Payload): Promise<void> {
        await this.wrapper.putRelation(this.db, keys, payload)
    }
    
}
