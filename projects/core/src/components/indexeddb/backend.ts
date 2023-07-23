import idb from "idb"
import { IndexedDBSchema } from "./schema"
import { DBClients, DBSearch } from "@xnh-db/common"
import { sortBy } from "lodash"

export module IndexedDBBackend {
    export interface IBackend {

    }

    type InternalIDB = idb.IDBPDatabase<IndexedDBSchema.Schema>
    type StoreNames = idb.StoreNames<IndexedDBSchema.Schema> & keyof IndexedDBSchema.Schema

    export class Backend implements IBackend {
        private entities: EntityAdaptor
        private properties: PropertyAdaptor
        private fullText: FullTextAdaptor
        private files: FilesAdaptor

        constructor(db: InternalIDB) {
            this.entities = new EntityAdaptor(db)
            this.properties = new PropertyAdaptor(db)
            this.fullText = new FullTextAdaptor(db)
            this.files = new FilesAdaptor(db)
        }
    }

    export function open(name: string): Promise<InternalIDB> {
        return idb.openDB<IndexedDBSchema.Schema>(name, 1, {
            upgrade(db) {
                // entities
                initializeStore(db, "entityIndex", IndexedDBSchema.Entity.entityIndices)
                initializeStore(db, "entityData", {})
                
                // properties
                initializeStore(db, "propertyIndex", IndexedDBSchema.Property.entityIndices)
                initializeStore(db, "propertyGlobal", IndexedDBSchema.Property.globalIndices)

                // full text
                initializeStore(db, "fullTextEntity", IndexedDBSchema.FullText.entityIndices)
                initializeStore(db, "fullTextCollection", IndexedDBSchema.FullText.collectionIndices)
                initializeStore(db, "fullTextGlobal", {})

                // files
                initializeStore(db, "fileOfEntity", IndexedDBSchema.Files.entityIndices)
                initializeStore(db, "fileIndex", IndexedDBSchema.Files.fileIndices)
                initializeStore(db, "fileContent", {})
            }
        })

        function initializeStore<Name extends StoreNames>(db: InternalIDB, name: Name, indices: IndexedDBSchema.Schema[Name]["indexes"]) {
            const store = db.createObjectStore(name, {})
            for(const name in indices) {
                const prop = indices[name] as string | string[]
                store.createIndex(name, prop, {multiEntry: Array.isArray(prop)})
            }
        }
    }

    class DBWrapper<Name extends StoreNames> {
        constructor(private db: InternalIDB, private name: Name, private indices: IndexedDBSchema.Schema[Name]["indexes"]) {}

        async get(id: string): Promise<IndexedDBSchema.Schema[Name]["value"] | null> {
            const tx = this.db.transaction(this.name, "readonly")
            const result = await tx.store.get(id)
            await tx.done
            return result ?? null
        }

        async put(id: string, value: IndexedDBSchema.Schema[Name]["value"]): Promise<void> {
            const tx = this.db.transaction(this.name, "readwrite")
            await tx.store.put(value, id)
            await tx.done
        }

        async delete(id: string): Promise<void> {
            const tx = this.db.transaction(this.name, "readwrite")
            await tx.store.delete(id)
            await tx.done
        }

        async getKeysByIndex<Idx extends keyof IndexedDBSchema.Schema[Name]["indexes"]>(indexName: Idx, value: (typeof this.indices)[Idx]): Promise<string[]> {
            const tx = this.db.transaction(this.name, "readonly")
            const result = await tx.store.index(indexName).getAllKeys(value)
            await tx.done
            return result ?? null
        }

        async getValuesByIndex<Idx extends keyof IndexedDBSchema.Schema[Name]["indexes"]>(indexName: Idx, value: (typeof this.indices)[Idx]): Promise<IndexedDBSchema.Schema[Name]["value"][]> {
            const tx = this.db.transaction(this.name, "readonly")
            const result = await tx.store.index(indexName).getAll(value)
            await tx.done
            return result ?? null
        }
    }

    class EntityAdaptor {
        constructor(private db: InternalIDB) {}

        async put(type: string, id: string, version: number, entity: IndexedDBSchema.Entity.EntityBase) {
            const docId = IndexedDBSchema.Entity.entityId(type, id)
            await this.entityData.put(docId, entity)
            await this.entityIndex.put(docId, {type, id, version, status: DBClients.EntityState.Active})
        }

        async getIndex(type: string, id: string): Promise<null | IndexedDBSchema.Entity.EntityIndex> {
            const docId = IndexedDBSchema.Entity.entityId(type, id)
            return await this.entityIndex.get(docId)
        }
        
        async getContent(type: string, id: string): Promise<null | IndexedDBSchema.Entity.EntityBase> {
            const docId = IndexedDBSchema.Entity.entityId(type, id)
            return await this.entityData.get(docId)
        }

        async delete(type: string, id: string, version: number) {
            const docId = IndexedDBSchema.Entity.entityId(type, id)
            await this.entityIndex.put(docId, {type, id, version, status: DBClients.EntityState.Deleted})
            await this.entityData.delete(docId)
        }

        // db helpers
        private get entityIndex() {
            return new DBWrapper(this.db, "entityIndex", IndexedDBSchema.Entity.entityIndices)
        }

        private get entityData() {
            return new DBWrapper(this.db, "entityData", {})
        }
    }

    class PropertyAdaptor {
        constructor(private db: InternalIDB) {}

        async put(type: string, id: string, properties: DBClients.Query.EntityProperties): Promise<void> {
            for(const [propertyName, {propertyCollection, values}] of Object.entries(properties)) {
                const propId = IndexedDBSchema.Property.entityId(type, id, propertyName)
                await this.entity.put(propId, {id, type, propertyName, propertyCollection, values})
                for(const value of values) {
                    const tagId = IndexedDBSchema.Property.globalId(propertyCollection, value)
                    const current = await this.global.get(tagId)
                    const currentCount = current?.counts ?? 0
                    await this.global.put(tagId, {
                        value,
                        propertyCollection,
                        counts: 1 + currentCount
                    })
                }
            }
        }

        async delete(type: string, id: string): Promise<void> {
            const properties = await this.entity.getValuesByIndex("entity", [type, id])
            for(const prop of properties) {
                for(const value of prop.values) {
                    const tagId = IndexedDBSchema.Property.globalId(prop.propertyCollection, value)
                    const current = await this.global.get(tagId)
                    if(current == null) {
                        console.warn(`Missing tag info: ${prop.propertyCollection} ${value}`)
                    } else {
                        const nextCount = current.counts - 1
                        if (nextCount <= 0) {
                            // delete tag reference if ref count == 0
                            await this.global.delete(tagId)
                        } else {
                            // ref count --
                            await this.global.put(tagId, {...current, counts: nextCount})
                        }
                    }
                }
                // delete item
                const propId = IndexedDBSchema.Property.entityId(prop.type, prop.id, prop.propertyName)
                await this.entity.delete(propId)
            }
        }

        async queryEntities(type: string, propertyName: string, value: string): Promise<DBSearch.SearchResult[]> {
            const entities = await this.entity.getValuesByIndex("property", [propertyName, value])
            return entities.map(it => ({
                id: it.id,
                type: it.type,
                weight: 1.0
            }))
        }

        async getPropertyValues(propertyCollection: string): Promise<string[]> {
            const results = await this.global.getValuesByIndex("propertyCollection", propertyCollection)
            return sortBy(results, it => -it.counts).map(it => it.value)
        }

        // db helpers
        private get entity() {
            return new DBWrapper(this.db, "propertyIndex", IndexedDBSchema.Property.entityIndices)
        }

        private get global() {
            return new DBWrapper(this.db, "propertyGlobal", IndexedDBSchema.Property.globalIndices)
        }
    }

    class FullTextAdaptor {
        constructor(private db: InternalIDB) {}

        // db helpers
        private get entity() {
            return new DBWrapper(this.db, "fullTextEntity", IndexedDBSchema.FullText.entityIndices)
        }

        private get collection() {
            return new DBWrapper(this.db, "fullTextCollection", IndexedDBSchema.FullText.collectionIndices)
        }

        private get global() {
            return new DBWrapper(this.db, "fullTextGlobal", {})
        }
    }

    class FilesAdaptor {
        constructor(private db: InternalIDB) {}

        // db helpers
        private get content() {
            return new DBWrapper(this.db, "fileContent", {})
        }

        private get index() {
            return new DBWrapper(this.db, "fileIndex", IndexedDBSchema.Files.fileIndices)
        }

        private get entity() {
            return new DBWrapper(this.db, "fileOfEntity", IndexedDBSchema.Files.entityIndices)
        }
    }
}
