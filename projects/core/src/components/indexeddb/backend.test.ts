import "fake-indexeddb/auto"
import {describe, test, expect, beforeEach, afterEach} from "@jest/globals"
import {IndexedDBBackend} from "./backend"
import { DBClients, DBConfig, DBTokenize } from "@xnh-db/common"

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

    export const type_Character = "character"
    export const id_ChongYun = "chongyun"
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

    test("simple-case-1-entity-0-link", async () => {
        expect((await backend.listFiles()).length).toBe(0)
        
        const id = "chongyun"
        const type = TestEntities.type_Character
        const version = DBClients.Utils.NewVersion()
        const content = TestEntities.character_ChongYun
        const config = TestEntities.characterConfig

        await backend.writeFile(TestEntities.profileName_Chongyun, version, TestEntities.exampleProfileData)
        const fileList_1 = await backend.listFiles();
        expect(fileList_1.length).toBe(1)
        
        const extractedProperties = DBConfig.Convert.extractProperties(config, content)
        const extractedTerms = DBConfig.Convert.extractFullTextTerms(config, content)

        await backend.putEntity(type, id, version, {
            content,
            properties: extractedProperties,
            fullTextTerms: extractedTerms,
            files: [TestEntities.profileName_Chongyun]
        })

        const entityList_1 = await backend.listEntities()
        expect(entityList_1.length).toBe(1)
        expect(await backend.getEntityContent(type, id)).not.toBeNull()

        // property
        const queryProperty = await backend.queryByTag(type, "/age", "shota")
        expect(queryProperty.length).toBe(1)
        expect(queryProperty[0].id).toBe(id)
        
        expect((await backend.queryByTag(type, "/age", "not_age")).length).toBe(0)

        // full text
        const queryFullTextPropertyCollection = await backend.queryByFullTextTermInCollection(type, "重云")
        expect(queryFullTextPropertyCollection.length).toBe(1)
        expect(queryFullTextPropertyCollection[0].id).toBe(id)

        expect((await backend.queryByFullTextTermInCollection(type, "NotTerm")).length).toBe(0)

        const queryFullTextPropertyGlobal = await backend.queryByFullTextTermGlobal("重云")
        expect(queryFullTextPropertyGlobal.length).toBe(1)
        expect(queryFullTextPropertyGlobal[0].id).toBe(id)

        expect((await backend.queryByFullTextTermInCollection("not_type", "重云")).length).toBe(0)

        // delete
        const newVersion = DBClients.Utils.NewVersion()
        await backend.deleteEntity(type, id, newVersion)
        
        const entityList_2 = await backend.listEntities()
        expect(entityList_2[0].id).toBe(id)
        expect(entityList_2[0].status).toBe(DBClients.EntityState.Deleted)
        expect(await backend.getEntityContent(type, id)).toBeNull()

        expect((await backend.queryByTag(type, "/age", "shota")).length).toBe(0)
        expect((await backend.queryByFullTextTermInCollection(type, "重云")).length).toBe(0)
        expect((await backend.queryByFullTextTermGlobal("重云")).length).toBe(0)

        const fileList_2 = await backend.listFiles()
        expect(fileList_2[0].status).toBe(DBClients.EntityState.Active)
        expect((await backend.readFile(TestEntities.profileName_Chongyun))).not.toBeNull()

        await backend.purgeFiles()
        expect((await backend.readFile(TestEntities.profileName_Chongyun))).toBeNull()
    })
})