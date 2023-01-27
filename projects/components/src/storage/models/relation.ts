import { ConfigFromDeclaration, IOfflineClient, IOnlineClient } from "@xnh-db/protocol"
import * as idb from "idb"
import { IdbCollectionWrapper } from "./collection"

type RelationItem<K extends string> = {
    keys: Record<K, string>
    updatedAt: Date
}

export class IdbRelationWrapper<C extends Record<string, any>, Payload> {
    readonly storeName: string

    constructor(private wrappers: {[K in keyof C]: IdbCollectionWrapper<C[K]>}) {
        for(const key of Object.keys(wrappers)) {
            const wrapper = wrappers[key]
            wrapper.onDelete((db, id) => {
                return this.deleteRelationByKey(db, key, id)
            })
        }
        this.storeName = this._storeName()
    }

    async onUpgrade(db: idb.IDBPDatabase) {
        const store = db.createObjectStore(this.storeName)

        for(const key of Object.keys(this.wrappers)) {
            store.createIndex(this.indexName(key), this.indexKeyPath(key))
        }
    }

    private _storeName(): string {
        const list = Array.from(Object.keys(this.wrappers))
        list.sort()
        return `relation_${list.join("-")}`
    }

    private indexName(name: keyof C) {
        return `key:${name as string}`
    }

    private indexKeyPath(name: string) {
        return ["keys", name]
    }

    async deleteRelationByKey(db: idb.IDBPDatabase, name: keyof C, id: string) {
        const tx = db.transaction(this.storeName, "readwrite")
        tx.db.getAllKeysFromIndex(this.storeName, this.indexName(name), id)
        await tx.done
    }
}

export class IdbRelationClient<C extends Record<string, any>, Payload> implements IOnlineClient.Relation<keyof C & string, Payload>, IOfflineClient.Relation<keyof C & string, Payload> {
    getIndex(): Promise<IOfflineClient.CollectionIndex<Record<keyof C & string, string>>> {
        throw new Error("Method not implemented.")
    }
    getPayload(keys: Record<keyof C & string, string>): Promise<Payload> {
        throw new Error("Method not implemented.")
    }
    putRelation(keys: Record<keyof C & string, string>, payload: Payload, updatedAt: Date): Promise<void> {
        throw new Error("Method not implemented.")
    }
    deleteRelation(keys: Record<keyof C & string, string>): Promise<void> {
        throw new Error("Method not implemented.")
    }
    
}
