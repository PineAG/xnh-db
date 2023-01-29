import * as idb from "idb"

export interface IdbIndexOption {
    keyPath: string
    isArray: boolean
    unique: boolean
}

export class IdbStoreWrapper<T, Indices extends string> {
    constructor(private storeName: string, private indices: Record<Indices, IdbIndexOption>) {
        
    }

    initialize(db: idb.IDBPDatabase) {
        const store = db.createObjectStore(this.storeName)
        for(const name of Object.keys(this.indices)) {
            const options: IdbIndexOption = this.indices[name]
            store.createIndex(name, options.keyPath, {multiEntry: options.isArray, unique: options.unique})
        }
    }

    async updateStoreIndices(db: idb.IDBPDatabase) {
        const tx = db.transaction(this.storeName, "versionchange")
        const names = new Set(tx.store.indexNames)
        for(const name in this.indices) {
            if(!names.has(name)) {
                const options = this.indices[name]
                tx.store.createIndex(name, options.keyPath, {multiEntry: options.isArray, unique: options.unique})
            }
        }
        await tx.done
    }

    private async transaction<Mode extends "readonly" | "readwrite", R>(db: idb.IDBPDatabase, mode: Mode, cb: (tx: idb.IDBPTransaction<any, any, Mode>) => Promise<R>): Promise<R> {
        const tx = db.transaction(this.storeName, mode)
        const result = await cb(tx)
        await tx.done
        return result
    }

    get(db: idb.IDBPDatabase, id: string): Promise<T | undefined> {
        return this.transaction(db, "readonly", async tx => {
            return await tx.store.get(id)
        }) 
    }

    getAllKeys(db: idb.IDBPDatabase): Promise<string[]> {
        return this.transaction(db, "readonly", async tx => {
            return await tx.store.getAllKeys()
        }) 
    }

    put(db: idb.IDBPDatabase, id: string, value: T): Promise<void> {
        return this.transaction(db, "readwrite", async tx => {
            await tx.store.put(value, id)
        })
    }

    delete(db: idb.IDBPDatabase, id: string): Promise<void> {
        return this.transaction(db, "readwrite", async tx => {
            await tx.store.delete(id)
        })
    }

    clear(db: idb.IDBPDatabase): Promise<void> {
        return this.transaction(db, "readwrite", async tx => {
            await tx.store.clear()
        })
    }

    getKeysByIndex<Idx extends Indices>(db: idb.IDBPDatabase, indexName: Idx, value: any): Promise<string[]> {
        return this.transaction(db, "readonly", async tx => {
            return tx.db.getAllKeysFromIndex(this.storeName, indexName, value)
        })
    }

    getAllByIndex<Idx extends Indices>(db: idb.IDBPDatabase, indexName: Idx, value: any): Promise<T[]> {
        return this.transaction(db, "readonly", async tx => {
            return tx.db.getAllFromIndex(this.storeName, indexName, value)
        })
    }
}