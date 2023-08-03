import "fake-indexeddb/auto"
import {deleteDB} from "idb"
import {IndexedDBBackend} from "../indexeddb"
import {describe, test, beforeEach, afterEach, expect} from "@jest/globals"
import { DBClients, DBConfig } from "@xnh-db/common"
import { StagingStore } from "./store"

export module TestConfig {
    export const config = DBConfig.create(f => ({
        tags: f.tagList({tagCollection: "tag"})
    }))

    export type Item = DBConfig.PartialEntity<typeof config>
}

export module Utils {
    export function delay(i: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, i)
        })
    }

    export async function pendResult<T, TId>(getter: () => StagingStore.DataWrapper<T, TId>): Promise<T | null> {
        for(;;) {
            const result = getter()
            if(result.status === StagingStore.DataStatus.Active) {
                return result.data
            } else if (result.status === StagingStore.DataStatus.Deleted) {
                return null
            } else if (result.status === StagingStore.DataStatus.Failure) {
                throw new Error(result.message)
            }
            await delay(100)
        }
    }

    export class MockBackend implements DBClients.FullSync.IReader {
        private files = new Map<string, Uint8Array>()
        readStoreState(): Promise<DBClients.FullSync.StoreState> {
            throw new Error("Method not implemented.")
        }
        readEntity(type: string, id: string): Promise<{}> {
            throw new Error("Method not implemented.")
        }
        async readFile(name: string): Promise<Uint8Array> {
            const content = this.files.get(name)
            if(content == null) {
                throw new Error(`Not found: ${name}`)
            }
            return content
        }
        
        putFile(name: string, value: Uint8Array) {
            this.files.set(name, value)
        }
        clear() {
            this.files.clear()
        }
    }
}

describe("staging-tests", () => {
    let db: IndexedDBBackend.ClientIDB
    let backend: IndexedDBBackend.Client
    let store: StagingStore.Store
    let fallbackBackend: Utils.MockBackend

    beforeEach(async () => {
        db = await IndexedDBBackend.open("test")
        backend = new IndexedDBBackend.Client(db)
        fallbackBackend = new Utils.MockBackend()
        store = new StagingStore.Store({
            backend,
            fallbackBackend,
        })
    })

    afterEach(async () => {
        db.close()
        fallbackBackend.clear()
        await deleteDB("test")
    })

    test("happy-case", async () => {
        const type = "item"
        const id = "item1"
        await backend.putEntity(type, id, 1, {
            content: {tags: ["a"]},
            files: [],
            properties: {},
            fullTextTerms: []
        })
        const entity = await Utils.pendResult(() => store.entity(type, id))
        expect(entity).not.toBeNull()
    })

    test.only("sync-back", async () => {
        const type = "item"
        const id = "item1"
        const id2 = "item2"
        const dst = new DBClients.FullSync.QueryClientAdaptor(backend, {item: TestConfig.config})
        store.putEntity(type, id, 1, {tags: ["1"]})
        await backend.putEntity(type, id2, 1, {content: {tags: ["2"]}, files: [], properties: {}, fullTextTerms: []})
        store.deleteEntity(type, id2, 2)
        const actions = await DBClients.FullSync.Actions.extractActions(store, dst)
        expect(actions.putEntity.length).toBe(1)
        expect(actions.deleteEntity.length).toBe(1)
        await DBClients.FullSync.Actions.performActions(dst, actions)
        const entity1 = await backend.getEntityIndex(type, id)
        const entity2 = await backend.getEntityIndex(type, id2)
        expect(entity1?.status).toBe(DBClients.EntityState.Active)
        expect(entity2?.status).toBe(DBClients.EntityState.Deleted)
    })
})
