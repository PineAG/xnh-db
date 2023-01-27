import * as idb from "idb"
import { createDBClientsFromIdbInstance, createDBWrappers } from "./models/data"

const IndexedDBName = "xnh-db.cache"

export async function createIdbClients() {
    const wrappers = createDBWrappers()
    const db = await idb.openDB(IndexedDBName, 1, {
        upgrade: db => {
            for(const c of Object.values(wrappers.collections)) {
                c.onUpgrade(db)
            }
            for(const r of Object.values(wrappers.inheritance)) {
                r.onUpgrade(db)
            }
            for(const r of Object.values(wrappers.relations)){
                r.onUpgrade(db)
            }
        }
    })
    return createDBClientsFromIdbInstance(db, wrappers)
}
