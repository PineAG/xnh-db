import * as idb from "idb"
import { createOfflineClientsFromIdbInstance, createOnlineClientsFromIdbInstance, createDBWrappers, initializeWrappers } from "./models/data"

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
