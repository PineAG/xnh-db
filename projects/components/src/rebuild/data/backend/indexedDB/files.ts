import { IOfflineClient, IOnlineClient } from "@xnh-db/protocol"
import * as idb from "idb"
import { GlobalStatusWrapper } from "./global"
import { IdbStoreWrapper } from "./wrapper"

export module IdbFileClientWrapper {
    const blobWrapper = new IdbStoreWrapper<Blob, never>("_files:blob", {})
    const existWrapper = new IdbStoreWrapper<boolean, never>("_files:exists", {})
    const timeWrapper = new IdbStoreWrapper<number, never>("_files:updatedAt", {})

    export function initialize(db: idb.IDBPDatabase) {
        blobWrapper.initialize(db)
        timeWrapper.initialize(db)
        existWrapper.initialize(db)
    }

    export async function exists(db: idb.IDBPDatabase, name: string): Promise<boolean> {
        return !!(await existWrapper.get(db, name))
    }

    export function read(db: idb.IDBPDatabase, name: string): Promise<Blob> {
        return blobWrapper.get(db, name)
    }

    export async function write(db: idb.IDBPDatabase, name: string, data: Blob): Promise<void> {
        await blobWrapper.put(db, name, data)
        await existWrapper.put(db, name, true)
    }
    
    export async function remove(db: idb.IDBPDatabase, name: string): Promise<void> {
        await blobWrapper.delete(db, name)
        await existWrapper.delete(db, name)
    }

    export async function list(db: idb.IDBPDatabase): Promise<string[]> {
        return await timeWrapper.getAllKeys(db)
    }

    export async function getAllIndices(db: idb.IDBPDatabase): Promise<[string, Date][]> {
        const keys = await timeWrapper.getAllKeys(db)
        return await Promise.all(keys.map(async k => {
            const time = await timeWrapper.get(db, k)
            return [k, new Date(time)] as [string, Date]
        }))
    }

    export async function flushAllIndices(db: idb.IDBPDatabase, indices: [string, Date][]): Promise<void> {
        await timeWrapper.clear(db)
        await Promise.all(indices.map(async ([key, date]) => {
            await timeWrapper.put(db, key, date.getTime())
        }))
    }

    export async function setIndex(db: idb.IDBPDatabase, name: string, updatedAt: Date): Promise<void> {
        await timeWrapper.put(db, name, updatedAt.getDate())
    }

    
    export async function setCollectionStatus(db: idb.IDBPDatabase, status: IOfflineClient.LatestStatus): Promise<void> {
        return GlobalStatusWrapper.setCollectionStatus(db, "__files", status)
    }

    export async function getCollectionStatus(db: idb.IDBPDatabase): Promise<IOfflineClient.LatestStatus> {
        return GlobalStatusWrapper.getCollectionStatus(db, "__files")
    }
}

export class IdbFileOnlineClient implements IOnlineClient.Files {
    constructor(private dbFactory: () => Promise<idb.IDBPDatabase>) {}

    private async withDB<R>(cb: (db: idb.IDBPDatabase) => Promise<R>): Promise<R> {
        const db = await this.dbFactory()
        const result = await cb(db)
        db.close()
        return result
    }

    list(): Promise<string[]> {
        return this.withDB(db => {
            return IdbFileClientWrapper.list(db)
        })
    }
    read(name: string): Promise<Blob> {
        return this.withDB(db => {
            return IdbFileClientWrapper.read(db, name)
        })
    }
    
    available(name: string): Promise<boolean> {
        return this.withDB(db => {
            return IdbFileClientWrapper.exists(db, name) 
        })
    }
    
    async write(name: string, value: Blob): Promise<void> {
        return this.withDB(async db => {
            await IdbFileClientWrapper.write(db, name, value)
            const updatedAt = new Date()
            await IdbFileClientWrapper.setIndex(db, name, updatedAt)
            await IdbFileClientWrapper.setCollectionStatus(db, {updatedAt})
        })
    }
    delete(name: string): Promise<void> {
        return this.withDB(async db => {
            return IdbFileClientWrapper.remove(db, name)
        })
    }
    
}

export class IdbFileOfflineClient implements IOfflineClient.Files {
    constructor(private dbFactory: () => Promise<idb.IDBPDatabase>) {}

    private async withDB<R>(cb: (db: idb.IDBPDatabase) => Promise<R>): Promise<R> {
        const db = await this.dbFactory()
        const result = await cb(db)
        db.close()
        return result
    }
    
    getStatus(): Promise<IOfflineClient.LatestStatus> {
        return this.withDB(async db => {
            return IdbFileClientWrapper.getCollectionStatus(db)
        })
    }
    setStatus(status: IOfflineClient.LatestStatus): Promise<void> {
        return this.withDB(async db => {
            return IdbFileClientWrapper.setCollectionStatus(db, status)
        })
    }
    async getIndex(): Promise<IOfflineClient.CollectionIndex<string>> {
        return this.withDB(async db => {
            const indices = await IdbFileClientWrapper.getAllIndices(db)
            return indices.map(([key, date]) => ({key, date}))
        })
    }
    flushIndex(index: IOfflineClient.CollectionIndex<string>): Promise<void> {
        return this.withDB(async db => {
            const list = index.map(({key, date}) => [key, date] as [string, Date])
            return IdbFileClientWrapper.flushAllIndices(db, list)
        })
    }
    read(name: string): Promise<Blob> {
        return this.withDB(async db => {
            return IdbFileClientWrapper.read(db, name)
        })
    }
    write(name: string, value: Blob): Promise<void> {
        return this.withDB(async db => {
            return IdbFileClientWrapper.write(db, name, value)
        })
    }
    delete(name: string): Promise<void> {
        return this.withDB(async db => {
            return IdbFileClientWrapper.remove(db, name)
        })
    }
    
}
