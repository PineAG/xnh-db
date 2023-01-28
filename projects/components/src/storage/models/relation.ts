import { IOfflineClient, IOnlineClient } from "@xnh-db/protocol"
import * as idb from "idb"
import { IdbCollectionWrapper } from "./collection"

type RelationItem<K extends string | symbol | number, Payload> = {
    keys: Record<K, string>
    payload: Payload
    updatedAt: Date
}

export class IdbRelationWrapper<C extends Record<string, any>, Payload> {
    readonly storeName: string
    readonly sortedKeys: string[]

    constructor(private wrappers: {[K in keyof C]: IdbCollectionWrapper<C[K]>}) {
        for(const key of Object.keys(wrappers)) {
            const wrapper = wrappers[key]
            wrapper.onDelete((db, id) => {
                return this.deleteRelationByKey(db, key, id)
            })
        }

        const sortedKeys = Array.from(Object.keys(wrappers))
        sortedKeys.sort()
        this.sortedKeys = sortedKeys

        this.storeName = `relation_${sortedKeys.map(k => `${k}:${wrappers[k].name}`).join("_")}`
    }

    onUpgrade(db: idb.IDBPDatabase) {
        const store = db.createObjectStore(this.storeName)

        for(const key of Object.keys(this.wrappers)) {
            store.createIndex(this.indexName(key), this.indexKeyPath(key), {unique: false})
        }
    }

    private indexName(name: keyof C) {
        return `key:${this.storeName}:${name as string}`
    }

    private indexKeyPath(name: string) {
        return ["keys", name]
    }

    private extractId(keys: Record<keyof C, string>) {
        return this.sortedKeys.map(k => keys[k]).join("_")
    }

    async deleteRelationByKey(db: idb.IDBPDatabase, name: keyof C, id: string) {
        const tx = db.transaction(this.storeName, "readwrite")
        tx.db.getAllKeysFromIndex(this.storeName, this.indexName(name), id)
        await tx.done
    }

    async getPayload(db: idb.IDBPDatabase, keys: Record<keyof C, string>): Promise<Payload> {
        const tx = db.transaction(this.storeName, "readonly")
        const item: RelationItem<keyof C & string, Payload> = await tx.store.get(this.extractId(keys))
        if(!item) {
            throw new Error(`Not found: ${this.storeName}: ${JSON.stringify(keys)}`)
        }
        return item.payload
    }

    async putRelation(db: idb.IDBPDatabase, keys: Record<keyof C, string>, payload: Payload, updatedAt: Date) {
        const item: RelationItem<keyof C & string, Payload> = {
            keys,
            payload,
            updatedAt
        }
        const tx = db.transaction(this.storeName, "readwrite")
        const id = this.extractId(keys)
        tx.store.put(item, id)
        await tx.done
    }

    async deleteRelation(db: idb.IDBPDatabase, keys: Record<keyof C, string>) {
        const tx = db.transaction(this.storeName, "readwrite")
        await tx.store.delete(this.extractId(keys))
        await tx.done
    }

    async getIndex(db: idb.IDBPDatabase): Promise<IOfflineClient.CollectionIndex<Record<keyof C, string>>> {
        const tx = db.transaction(this.storeName, "readonly")
        const items: RelationItem<keyof C, Payload>[] = await tx.store.getAll()
        await tx.done
        return items.map(it => ({key: it.keys, date: it.updatedAt}))
    }

}

export class IdbRelationClient<C extends Record<string, any>, Payload> implements IOnlineClient.Relation<keyof C & string, Payload>, IOfflineClient.Relation<keyof C & string, Payload> {
    constructor(private db: idb.IDBPDatabase, private wrapper: IdbRelationWrapper<C, Payload>) {
    }
    getIndex(): Promise<IOfflineClient.CollectionIndex<Record<keyof C, string>>> {
        return this.wrapper.getIndex(this.db)
    }
    flushIndex(index: IOfflineClient.CollectionIndex<Record<keyof C & string, string>>): Promise<void> {
        throw new Error("Method not implemented.")
    }
    updateRelation(keys: Record<keyof C & string, string>, payload: Payload): Promise<void> {
        throw new Error("Method not implemented.")
    }
    getPayload(keys: Record<keyof C, string>): Promise<Payload> {
        return this.wrapper.getPayload(this.db, keys)
    }
    putRelation(keys: Record<keyof C, string>, payload: Payload, updatedAt: Date): Promise<void> {
        return this.wrapper.putRelation(this.db, keys, payload, updatedAt)
    }
    deleteRelation(keys: Record<keyof C, string>): Promise<void> {
        return this.wrapper.deleteRelation(this.db, keys)
    }
    
}
