import * as idb from "idb"

const IndexedDBName = "xnh-db.cache"
const Store_Character = "characters"

export async function openLocalCacheDB() {
    const db = await idb.openDB(IndexedDBName, 1, {
        upgrade: db => {
            const store = db.createObjectStore(Store_Character, {keyPath: "id"})
            store.createIndex("characters_name", "name")
            store.createIndex("characters_tags", "tags", {multiEntry: true})
            store.createIndex("characters_deep", ["deep", "foo"])
            console.log("Created")
        }
    })

    console.log("BEFORE")
    const tx = db.transaction(Store_Character, "readwrite")
    const newItem = {name: "FUCK2", age: "YEA", tags: ["1", "2", "3"], deep: {foo: 233}, id: crypto.randomUUID()}
    await tx.store.add(newItem)
    await tx.done

    const tx2 = db.transaction(Store_Character, "readonly")
    console.log("Count", await db.countFromIndex(Store_Character, "characters_tags", "2"))
    await tx2.done
    console.log("AFTER")
}