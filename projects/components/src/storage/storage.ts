import * as idb from "idb"
import { createOfflineClientsFromIdbInstance, createOnlineClientsFromIdbInstance, createDBWrappers, initializeWrappers, upgradeWrapperIndices } from "./models/data"

const IndexedDBName = "xnh-db.cache"

async function dbFactory(): Promise<idb.IDBPDatabase> {
    const wrappers = createDBWrappers()
    const db = await idb.openDB(IndexedDBName, 1, {
        upgrade: (db, oldVersion, newVersion, tx) => {
            initializeWrappers(db, wrappers)
        }
    })
    return db
}

export async function createIdbClients() {
    const wrappers = createDBWrappers()
    return {
        online: createOnlineClientsFromIdbInstance(dbFactory, wrappers),
        offline: createOfflineClientsFromIdbInstance(dbFactory, wrappers),
    }
}

export async function destroyIdbStorage() {
    console.log("Before delete")
    await idb.deleteDB(IndexedDBName)
    console.log("After delete")
}
