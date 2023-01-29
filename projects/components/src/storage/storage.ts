import * as idb from "idb"
import { createOfflineClientsFromIdbInstance, createOnlineClientsFromIdbInstance, createDBWrappers, initializeWrappers, upgradeWrapperIndices } from "./models/data"

const IndexedDBName = "xnh-db.cache"

export async function createIdbClients() {
    const wrappers = createDBWrappers()
    const db = await idb.openDB(IndexedDBName, 1, {
        upgrade: (db, oldVersion, newVersion, tx) => {
            initializeWrappers(db, wrappers)
        }
    })
    return {
        online: createOnlineClientsFromIdbInstance(db, wrappers),
        offline: createOfflineClientsFromIdbInstance(db, wrappers),
    }
}

export async function destroyIdbStorage() {
    // const db = await idb.openDB(IndexedDBName, 1)
    // for(const storeName of db.objectStoreNames) {
    //     const tx = db.transaction(storeName, "readwrite")
    //     tx.store.clear()
    //     await tx.done
    //     db.deleteObjectStore(storeName)
    // }
    // db.close()
    console.log("Before delete")
    await idb.deleteDB(IndexedDBName)
    console.log("After delete")
}
