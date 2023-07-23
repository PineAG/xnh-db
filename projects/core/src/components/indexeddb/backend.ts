import idb from "idb"
import { IndexedDBSchema } from "./schema"
import { DBClients, DBSearch, DBTokenize } from "@xnh-db/common"
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

                // links
                initializeStore(db, "links", IndexedDBSchema.Links.linkIndices)
                initializeStore(db, "linksReferenceNames", IndexedDBSchema.Links.referenceIndices)
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

    class EntityAdaptor {
        constructor(private db: InternalIDB) {}

        async listEntities(): Promise<IndexedDBSchema.Entity.EntityIndex[]> {
            return await this.entityIndex.allValues()
        }

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
            const entities = await this.entity.getValuesByIndex("property", [type, propertyName, value])
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

        async deleteEntity(type: string, id: string) {
            const result = await this.entity.getValuesByIndex("entity", [type, id])
            for(const t of result) {
                await this.deleteTerm(type, id, t.term)
            }
        }

        async putTerm(type: string, id: string, term: DBTokenize.IToken) {
            const termId = IndexedDBSchema.FullText.entityId(type, id, term.value)
            await this.entity.put(termId, {
                type, id, 
                term: term.value,
                weight: term.weight
            })
            await this.updateCollectionCounter(type, term.value, w => w + term.weight)
            await this.updateGlobalCounter(term.value, w => w + term.weight)
        }

        async deleteTerm(type: string, id: string, term: string) {
            const termId = IndexedDBSchema.FullText.entityId(type, id, term)
            const current = await this.entity.get(termId)
            if(!current) {
                console.warn(`Term does not exist: ${type} ${id} ${term}`)
                return
            }
            await this.entity.delete(termId)
            await this.updateCollectionCounter(type, current.term, w => w - current.weight)
            await this.updateGlobalCounter(current.term, w => w - current.weight)
        }

        async getEntitiesInCollection(type: string, term: string): Promise<DBSearch.SearchResult[]> {
            const result = await this.entity.getValuesByIndex("collectionTerm", [type, term])
            return result.map(it => ({type: it.type, id: it.id, weight: it.weight}))
        }

        async getEntitiesGlobal(term: string): Promise<DBSearch.SearchResult[]> {
            const result = await this.entity.getValuesByIndex("globalTerm", term)
            return result.map(it => ({type: it.type, id: it.id, weight: it.weight}))
        }

        async getTermWeightsGlobal(term: string): Promise<number | null> {
            const docId = IndexedDBSchema.FullText.globalId(term)
            const result = await this.global.get(docId)
            return result?.totalWeight ?? null
        }

        async getTermWeightsInCollection(type: string, term: string): Promise<number | null> {
            const docId = IndexedDBSchema.FullText.collectionId(type, term)
            const result = await this.collection.get(docId)
            return result?.totalWeight ?? null
        }

        private async updateCollectionCounter(type: string, term: string, weightUpdater: (w: number) => number ){
            const docId = IndexedDBSchema.FullText.collectionId(type, term)
            const current = await this.collection.get(docId)
            const nextWeight = weightUpdater(current?.totalWeight ?? 0)
            if(nextWeight <= 0) {
                await this.collection.delete(docId)
            } else {
                await this.collection.put(docId, {
                    term, type,
                    totalWeight: nextWeight
                })
            }
        }

        private async updateGlobalCounter(term: string, weightUpdater: (w: number) => number ){
            const docId = IndexedDBSchema.FullText.globalId(term)
            const current = await this.global.get(docId)
            const nextWeight = weightUpdater(current?.totalWeight ?? 0)
            if(nextWeight <= 0) {
                await this.global.delete(docId)
            } else {
                await this.global.put(docId, {
                    term,
                    totalWeight: nextWeight
                })
            }
        }

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

        async listFiles(): Promise<DBClients.FileIndex[]> {
            return await this.index.allValues()
        }

        async putFile(name: string, version: number, content: DBClients.FileContent): Promise<void> {
            await this.content.put(name, content)
            await this.updateIndex(name, version, DBClients.EntityState.Active, it => it)
        }

        async deleteFile(name: string) {
            const idx = await this.index.get(name)
            if(idx === null) {
                console.warn(`File has already been deleted: ${name}`)
                return
            }
            if(!idx.noReference) {
                throw new Error(`File is referred by some entities: ${name}`)
            }

            await this.updateIndex(name, idx.version, DBClients.EntityState.Deleted, it => it)
            await this.content.delete(name)
        }

        async putEntity(type: string, id: string, version: number, files: string[]) {
            for(const f of files) {
                await this.linkFile(type, id, version, f)
            }
        }

        async deleteEntity(type: string, id: string, version: number) {
            const files = await this.entity.getValuesByIndex("entity", [type, id])
            for(const f of files) {
                await this.unlinkFile(f.type, f.id, version, f.fileName)
            }
        }

        async linkFile(type: string, id: string, version: number, fileName: string) {
            const entityId = IndexedDBSchema.Files.entityId(type, id, fileName)
            const current = await this.entity.get(entityId)
            if(current) {
                console.warn(`File link already exists: ${type} ${id} ${fileName}`)
                return
            }
            await this.entity.put(entityId, {type, id, fileName})
            await this.updateIndex(fileName, version, DBClients.EntityState.Active, it => it + 1)
        }

        async unlinkFile(type: string, id: string, version: number, fileName: string) {
            const entityId = IndexedDBSchema.Files.entityId(type, id, fileName)
            const current = await this.entity.get(entityId)
            if(!current) {
                console.warn(`File link not exists: ${type} ${id} ${fileName}`)
                return
            }
            await this.entity.delete(entityId)
            await this.updateIndex(fileName, version, DBClients.EntityState.Active, it => it - 1)
        }

        async purgeFiles() {
            const names = await this.index.getKeysByIndex("purging", [DBClients.EntityState.Active, true])
            for(const n of names) {
                await this.deleteFile(n)
            }
        }

        private async updateIndex(name: string, version: number, status: DBClients.EntityState, counterUpdater: (c: number) => number) {
            const currentIndex = await this.index.get(name)
            const currentCount = currentIndex?.counts ?? 0
            const nextCount = counterUpdater(currentCount)
            await this.index.put(name, {
                name, version,
                counts: nextCount,
                status,
                noReference: nextCount <= 0
            })
        }

        // db helpers
        private get content() {
            return new FileContentWrapper(this.db)
        }

        private get index() {
            return new DBWrapper(this.db, "fileIndex", IndexedDBSchema.Files.fileIndices)
        }

        private get entity() {
            return new DBWrapper(this.db, "fileOfEntity", IndexedDBSchema.Files.entityIndices)
        }
    }

    class LinkAdaptor {
        constructor(private db: InternalIDB) {}

        async listLinks(): Promise<IndexedDBSchema.Links.LinkRef[]> {
            const results = await this.links.allValues()
            return results.map(it => ({
                ...IndexedDBSchema.Links.convertDBLinkToBiLink(it),
                version: it.version,
                status: it.status
            }))
        }

        async putLink(left: IndexedDBSchema.Links.LinkItem, right: IndexedDBSchema.Links.LinkItem, version: number): Promise<void> {
            const biLink = IndexedDBSchema.Links.createBiLink(left, right)
            const dbLink = IndexedDBSchema.Links.convertBiLinkToDBLink(biLink)
            const docId = IndexedDBSchema.Links.linkId(dbLink)

            await this.links.put(docId, {
                ...dbLink,
                version,
                status: DBClients.EntityState.Active
            })
            
            const refId = IndexedDBSchema.Links.referenceId(
                biLink.left.type, biLink.left.referenceName,
                biLink.right.type, biLink.right.referenceName)
            const currentRef = await this.referenceNames.get(refId)
            const currentCounts = currentRef?.counts ?? 0
            await this.referenceNames.put(refId, {
                leftType: biLink.left.type,
                leftReferenceName: biLink.left.referenceName,
                rightType: biLink.right.type,
                rightReferenceName: biLink.right.referenceName,
                counts: currentCounts + 1
            })
        }

        async deleteLink(left: IndexedDBSchema.Links.LinkItem, right: IndexedDBSchema.Links.LinkItem, version: number): Promise<void> {
            const biLink = IndexedDBSchema.Links.createBiLink(left, right)
            const dbLink = IndexedDBSchema.Links.convertBiLinkToDBLink(biLink)
            const docId = IndexedDBSchema.Links.linkId(dbLink)

            const current = await this.links.get(docId)
            if(current === null) {
                console.warn("Link does not exist.")
                return
            }

            await this.links.put(docId, {
                ...current, 
                status: DBClients.EntityState.Deleted,
                version
            })

            const references = await this.referenceNames.getValuesByIndex("types", [biLink.left.type, biLink.right.type])
            for(const ref of references) {
                const nextCount = ref.counts - 1
                const refId = IndexedDBSchema.Links.referenceId(left.type, left.referenceName, right.type, right.referenceName)
                if(nextCount <= 0) {
                    await this.referenceNames.delete(refId)
                } else {
                    await this.referenceNames.put(refId, {
                        ...current,
                        counts: nextCount
                    })
                }
            }
        }

        async getLinksByEntity(type: string, id: string): Promise<IndexedDBSchema.Links.ClientLink[]> {
            const leftResults = await this.links.getValuesByIndex("left", [type, id, DBClients.EntityState.Active])
            const rightResults = await this.links.getValuesByIndex("right", [type, id, DBClients.EntityState.Active])
            const results = [...leftResults, ...rightResults]
            return results
                .map(it => IndexedDBSchema.Links.convertDBLinkToBiLink(it))
                .map(it => IndexedDBSchema.Links.convertBiLinkToClientLink(type, id, it))
        }

        async deleteEntity(type: string, id: string, version: number): Promise<void> {
            const leftResults = await this.links.getValuesByIndex("left", [type, id, DBClients.EntityState.Active])
            const rightResults = await this.links.getValuesByIndex("right", [type, id, DBClients.EntityState.Active])

            const results = [...leftResults, ...rightResults]
            for(const r of results) {
                const biLink = IndexedDBSchema.Links.convertDBLinkToBiLink(r)
                await this.deleteLink(biLink.left, biLink.right, version)
            }
        }

        // db helpers

        private get links() {
            return new DBWrapper(this.db, "links", IndexedDBSchema.Links.linkIndices)
        }

        private get referenceNames() {
            return new DBWrapper(this.db, "linksReferenceNames", IndexedDBSchema.Links.referenceIndices)
        }
    }

    // DB Helper

    class DBWrapper<Name extends StoreNames> {
        constructor(private db: InternalIDB, private name: Name, private indices: IndexedDBSchema.Schema[Name]["indexes"]) {}

        async allValues(): Promise<IndexedDBSchema.Schema[Name]["value"][]> {
            const tx = this.db.transaction(this.name, "readonly")
            const result = await tx.store.getAll()
            await tx.done
            return result
        }

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

    class FileContentWrapper {
        constructor(private db: InternalIDB) {}

        async get(name: string): Promise<IndexedDBSchema.Files.FileContent | null> {
            const tx = this.db.transaction("fileContent", "readonly")
            const result = await tx.store.get(name)
            await tx.done
            if(!result) {
                return null
            } else {
                const buffer = await result.arrayBuffer()
                return new Uint8Array(buffer)
            }
        }

        async put(name: string, content: IndexedDBSchema.Files.FileContent) {

        }

        async delete(name: string) {

        }
    }
}
