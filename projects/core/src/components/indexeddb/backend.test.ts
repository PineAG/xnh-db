import "fake-indexeddb/auto"
import {describe, test, expect, beforeEach, afterEach} from "@jest/globals"
import {IndexedDBBackend} from "./backend"
import { DBConfig, DBTokenize } from "@xnh-db/common"

module TestEntities {
    const tokenizer = DBTokenize.Tokenizers.GeneralTokenizer(1, 20)

    export const characterConfig = DBConfig.create(f => (
        {
            title: f.fullText({weight: 1.0, tokenizer}),
            name: f.fullTextList({weight: 1.0, tokenizer}),
            age: f.tagList({tagCollection: "age"}),
            profile: f.file({fileCollection: "profile"}),
            outlook: {
                eye: {
                    color: f.tagList({tagCollection: "color"})
                },
                hair: {
                    color: f.tagList({tagCollection: "color"})
                }
            }
        }
    ))

    export type Character = DBConfig.PartialEntity<typeof characterConfig>

    export const profileName_Chongyun = "chongyun.png"
    export const exampleProfileData = new Uint8Array()

    export const character_ChongYun: Character = {
        title: "重云",
        name: ["Chong Yun", "重云"],
        age: ["shota"],
        profile: profileName_Chongyun,
        outlook: {
            eye: {
                color: ["blue"]
            }, 
            hair: {
                color: ["blue"]
            }
        }
    }
}

describe("indexeddb-backend", () => {
    let db: IndexedDBBackend.ClientIDB
    let backend: IndexedDBBackend.Client
    
    let db2: IndexedDBBackend.ClientIDB
    let backend2: IndexedDBBackend.Client

    beforeEach(async () => {
        db = await IndexedDBBackend.open("test")
        backend = new IndexedDBBackend.Client(db)
        
        db2 = await IndexedDBBackend.open("test2")
        backend2 = new IndexedDBBackend.Client(db2)
    })

    afterEach(() => {
        db.close()
        db2.close()
    })

    test("simple-case", async () => {
        expect((await backend.listFiles()).length).toBe(0)
    })
})