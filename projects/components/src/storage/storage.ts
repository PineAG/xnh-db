import * as idb from "idb"
import { createDBClientsFromIdbInstance, createDBWrappers, initializeWrappers } from "./models/data"

const IndexedDBName = "xnh-db.cache"

export async function createIdbClients() {
    const wrappers = createDBWrappers()
    const db = await idb.openDB(IndexedDBName, 1, {
        upgrade: (db, oldVersion, newVersion, tx) => {
            console.log(db, oldVersion, newVersion)
            initializeWrappers(db, wrappers)
        }
    })
    return createDBClientsFromIdbInstance(db, wrappers)
}
