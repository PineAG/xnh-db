import "fake-indexeddb/auto"
import {deleteDB} from "idb"
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
        name: ["Chong Yun"],
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
    export const character_XingQiu: Character = {
        title: "行秋",
        name: ["Xing Qiu"],
        age: ["shota"],
        profile: profileName_Chongyun,
        outlook: {
            eye: {
                color: ["gold"]
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
    let syncClient: DBClients.FullSync.QueryClientAdaptor
    
    let db2: IndexedDBBackend.ClientIDB
    let backend2: IndexedDBBackend.Client
    let syncClient2: DBClients.FullSync.QueryClientAdaptor

    beforeEach(async () => {
        db = await IndexedDBBackend.open("test")
        backend = new IndexedDBBackend.Client(db)
        syncClient = new DBClients.FullSync.QueryClientAdaptor(backend, {character: TestEntities.characterConfig})
        
        db2 = await IndexedDBBackend.open("test2")
        backend2 = new IndexedDBBackend.Client(db2)
        syncClient2 = new DBClients.FullSync.QueryClientAdaptor(backend2, {character: TestEntities.characterConfig})
    })

    afterEach(async () => {
        db.close()
        db2.close()
        await deleteDB("test")
        await deleteDB("test2")
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
        
        await putCharacter(backend, id, version, TestEntities.character_ChongYun)

        const entityList_1 = await backend.listEntities()
        expect(entityList_1.length).toBe(1)
        expect(await backend.getEntityContent(type, id)).not.toBeNull()

        // property
        const queryProperty = await backend.queryByTag(type, "/age", "shota")
        expect(queryProperty.length).toBe(1)
        expect(queryProperty[0].id).toBe(id)
        
        expect((await backend.queryByTag(type, "/age", "not_age")).length).toBe(0)

        // full text
        const queryFullTextPropertyCollection = await backend.queryByFullTextTermInCollection(type, "Chong")
        expect(queryFullTextPropertyCollection.length).toBe(1)
        expect(queryFullTextPropertyCollection[0].id).toBe(id)

        expect((await backend.queryByFullTextTermInCollection(type, "NotTerm")).length).toBe(0)

        const queryFullTextPropertyGlobal = await backend.queryByFullTextTermGlobal("Chong")
        expect(queryFullTextPropertyGlobal.length).toBe(1)
        expect(queryFullTextPropertyGlobal[0].id).toBe(id)

        expect((await backend.queryByFullTextTermInCollection("not_type", "Chong")).length).toBe(0)

        // delete
        const newVersion = DBClients.Utils.NewVersion()
        await backend.deleteEntity(type, id, newVersion)
        
        const entityList_2 = await backend.listEntities()
        expect(entityList_2[0].id).toBe(id)
        expect(entityList_2[0].status).toBe(DBClients.EntityState.Deleted)
        expect(await backend.getEntityContent(type, id)).toBeNull()

        expect((await backend.queryByTag(type, "/age", "shota")).length).toBe(0)
        expect((await backend.queryByFullTextTermInCollection(type, "Chong")).length).toBe(0)
        expect((await backend.queryByFullTextTermGlobal("Chong")).length).toBe(0)

        const fileList_2 = await backend.listFiles()
        expect(fileList_2[0].status).toBe(DBClients.EntityState.Active)
        expect((await backend.readFile(TestEntities.profileName_Chongyun))).not.toBeNull()

        await backend.purgeFiles()
        expect((await backend.readFile(TestEntities.profileName_Chongyun))).toBeNull()
    })

    test("double-deletion", async () => {
        const id = "chongyun"
        const type = TestEntities.type_Character
        const version = DBClients.Utils.NewVersion()

        await putCharacter(backend, id, version, TestEntities.character_ChongYun)

        await backend.deleteEntity(type, id, DBClients.Utils.NewVersion())
        await backend.deleteEntity(type, id, DBClients.Utils.NewVersion())
    })

    test("links", async () => {
        const id1 = "chongyun"
        const id2 = "xingqiu"
        const type = TestEntities.type_Character
        const version = DBClients.Utils.NewVersion()

        await putCharacter(backend, id1, version, TestEntities.character_ChongYun)
        await putCharacter(backend, id2, version, TestEntities.character_XingQiu)
        await backend.putLink(
            {type, id: id1, referenceName: "bottom"},
            {type, id: id2, referenceName: "top"},
            version
        )

        const links1 = await backend.getLinksOfEntity(type, id1)
        expect(links1[0].self.id).toBe(id1)
        expect(links1[0].opposite.id).toBe(id2)

        const links2 = await backend.getLinksOfEntity(type, id2)
        expect(links2[0].self.id).toBe(id2)
        expect(links2[0].opposite.id).toBe(id1)

        const allLinks1 = await backend.listLinks()
        expect(allLinks1[0].status).toBe(DBClients.EntityState.Active)

        await backend.deleteEntity(type, id2, version)

        const allLinks2 = await backend.listLinks()
        expect(allLinks2[0].status).toBe(DBClients.EntityState.Deleted)

        const emptyLinks = await backend.getLinksOfEntity(type, id1)
        expect(emptyLinks.length).toBe(0)
    })

    test("sync", async () => {
        const version = DBClients.Utils.NewVersion()
        const version2 = version - 100
        await putCharacter(backend, "chongyun", version, TestEntities.character_ChongYun)
        await putCharacter(backend2, "xingqiu", version2, TestEntities.character_XingQiu)
        expect((await backend.listEntities()).length).toBe(1)
        expect((await backend2.listEntities()).length).toBe(1)
        const actions = await DBClients.FullSync.Actions.extractActions(syncClient, syncClient2)
        await DBClients.FullSync.Actions.performActions(syncClient2, actions, false)
        const entityList1 = await backend2.listEntities()
        expect(entityList1.length).toBe(2)

        const v3 = DBClients.Utils.NewVersion()
        await backend2.putLink({
            type: "character",
            id: "chongyun",
            referenceName: "bottom",
        }, {
            type: "character",
            id: "xingqiu",
            referenceName: "top",
        }, v3)

        const actions2 = await DBClients.FullSync.Actions.extractActions(syncClient2, syncClient)
        await DBClients.FullSync.Actions.performActions(syncClient, actions2, false)
        expect((await backend.listEntities()).length).toBe(2)
        expect((await backend.listLinks()).length).toBe(1)
        expect((await backend.listFiles()).length).toBe(1) // they share the same profile

        const v4 = DBClients.Utils.NewVersion()
        await backend.deleteEntity("character", "chongyun", v4) // delete one character
        const actions3 = await DBClients.FullSync.Actions.extractActions(syncClient, syncClient2)
        await DBClients.FullSync.Actions.performActions(syncClient2, actions3, false)

        
        {
            const entities = await backend2.listEntities()
            expect(entities.every(it => (
                it.id === "chongyun" && it.status === DBClients.EntityState.Deleted ||
                it.id === "xingqiu" && it.status === DBClients.EntityState.Active
            ))).toBeTruthy()

            const links = await backend2.listLinks();
            expect(links[0].status).toBe(DBClients.EntityState.Deleted)

            expect(await backend2.getEntityContent("character", "chongyun")).toBeNull()
        }

    })

    test("ref-count-link", async () => {
        const version = DBClients.Utils.NewVersion()
        await putCharacter(backend, "chongyun", version, TestEntities.character_ChongYun)
        await putCharacter(backend, "xingqiu", version, TestEntities.character_XingQiu)
        await backend.putLink({
            type: "character",
            id: "chongyun",
            referenceName: "bottom",
        }, {
            type: "character",
            id: "xingqiu",
            referenceName: "top",
        }, version)
        await backend.deleteEntity("character", "chongyun", version)
        const links = await backend.listLinks()
        expect(links[0].status).toBe(DBClients.EntityState.Deleted)
    })

    test("ref-count-file", async () => {
        const version = DBClients.Utils.NewVersion()
        await putCharacter(backend, "chongyun", version, TestEntities.character_ChongYun)
        await putCharacter(backend, "xingqiu", version, TestEntities.character_XingQiu)
        await backend.deleteEntity("character", "chongyun", version)
        await backend.purgeFiles();
        const files1 = await backend.listFiles()
        expect(files1[0].status).toBe(DBClients.EntityState.Active)
        expect(await backend.readFile(TestEntities.profileName_Chongyun)).not.toBeNull()
        await backend.deleteEntity("character", "xingqiu", version)
        await backend.purgeFiles();
        const files2 = await backend.listFiles()
        expect(files2[0].status).toBe(DBClients.EntityState.Deleted)
        expect(await backend.readFile(TestEntities.profileName_Chongyun)).toBeNull()
    })

    async function putCharacter(backend: IndexedDBBackend.Client, id: string, version: number, entity: TestEntities.Character) {
        const extractedProperties = DBConfig.Convert.extractProperties(TestEntities.characterConfig, entity)
        const extractedTerms = DBConfig.Convert.extractFullTextTerms(TestEntities.characterConfig, entity)
        await backend.writeFile(TestEntities.profileName_Chongyun, version, TestEntities.exampleProfileData)
        await backend.putEntity("character", id, version, {
            content: entity,
            properties: extractedProperties,
            fullTextTerms: extractedTerms,
            files: [TestEntities.profileName_Chongyun]
        })
    }
})