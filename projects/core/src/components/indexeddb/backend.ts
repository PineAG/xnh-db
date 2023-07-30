import type {IDBPDatabase, StoreNames as IDBStoreNames, IndexKey} from "idb"
import {openDB} from "idb"
import { IndexedDBSchema } from "./schema"
import { DBClients, DBSearch, DBTokenize } from "@xnh-db/common"
import { sortBy } from "lodash"

export module IndexedDBBackend {
    type InternalIDB = IDBPDatabase<IndexedDBSchema.Schema>
    type StoreNames = IDBStoreNames<IndexedDBSchema.Schema> & keyof IndexedDBSchema.Schema

    export type ClientIDB = InternalIDB

    export class Client implements DBClients.Query.IClient {
        private readonly entities: EntityAdaptor
        private readonly properties: PropertyAdaptor
        private readonly fullText: FullTextAdaptor
        private readonly files: FilesAdaptor
        private readonly links: LinkAdaptor

        constructor(db: InternalIDB) {
            this.entities = new EntityAdaptor(db)
            this.properties = new PropertyAdaptor(db)
            this.fullText = new FullTextAdaptor(db)
            this.files = new FilesAdaptor(db)
            this.links = new LinkAdaptor(db)
        }
        listEntities(): Promise<DBClients.EntityIndex[]> {
            return this.entities.listEntities()
        }
        getEntityIndex(type: string, id: string): Promise<DBClients.EntityIndex | null> {
            return this.entities.getIndex(type, id)
        }
        getEntityContent(type: string, id: string): Promise<{} | null> {
            return this.entities.getContent(type, id)
        }
        async putEntity(type: string, id: string, version: number, options: DBClients.Query.PutEntityOptions): Promise<void> {
            if(await this.entities.exists(type, id)) {
                await this.deleteEntityInternal(type, id, version)
            }

            await this.properties.put(type, id, options.properties)
            await this.fullText.putEntity(type, id, options.fullTextTerms)
            await this.files.putEntity(type, id, version, options.files)
            await this.entities.put(type, id, version, options.content)
        }
        async deleteEntity(type: string, id: string, version: number): Promise<void> {
            if(!await this.entities.exists(type, id)) {
                console.warn(`Not exists: ${type}, ${id}`)
                return
            }
            await this.deleteEntityInternal(type, id, version)
        }
        private async deleteEntityInternal(type: string, id: string, version: number) {
            await this.links.deleteEntity(type, id, version)
            await this.files.deleteEntity(type, id, version)
            await this.fullText.deleteEntity(type, id)
            await this.properties.delete(type, id)
            await this.entities.delete(type, id, version)
        }
        queryByTag(type: string, property: string, value: string): Promise<DBSearch.SearchResult[]> {
            return this.properties.queryEntities(type, property, value)
        }
        listTags(propertyCollection: string): Promise<string[]> {
            return this.properties.getPropertyValues(propertyCollection)
        }
        queryByFullTextTermGlobal(term: string): Promise<DBSearch.SearchResult[]> {
            return this.fullText.getEntitiesGlobal(term)
        }
        queryByFullTextTermInCollection(type: string, term: string): Promise<DBSearch.SearchResult[]> {
            return this.fullText.getEntitiesInCollection(type, term)
        }
        getFullTextWeightOfEntity(type: string, id: string): Promise<number | null> {
            return this.fullText.getWeightsOfEntity(type, id)
        }
        getFullTextTotalWeightInCollection(type: string, term: string): Promise<number | null> {
            return this.fullText.getTermWeightsInCollection(type, term)
        }
        getFullTextTotalWeightGlobal(term: string): Promise<number | null> {
            return this.fullText.getTermWeightsGlobal(term)
        }
        listFiles(): Promise<DBClients.FileIndex[]> {
            return this.files.listFiles()
        }
        async fileExists(name: string): Promise<boolean> {
            const result = await this.files.readIndex(name)
            const status = result?.status ?? DBClients.EntityState.Deleted
            return status === DBClients.EntityState.Active
        }
        async readFile(name: string): Promise<Uint8Array | null> {
            return await this.files.readFile(name)
        }
        async writeFile(name: string, version: number, content: Uint8Array): Promise<void> {
            await this.files.putContent(name, content)
            await this.files.touchFile(name, version)
        }
        async deleteFileContent(name: string): Promise<void> {
            await this.files.deleteFileContent(name)
        }
        async purgeFiles(): Promise<void> {
            await this.files.purgeFiles()
        }
        listLinks(): Promise<DBClients.Query.EntityLink[]> {
            return this.links.listLinks()
        }
        async putLink(left: DBClients.Query.EntityLinkReference, right: DBClients.Query.EntityLinkReference, version: number): Promise<void> {
            await this.links.putLink(left, right, version)
        }
        getLinksOfEntity(type: string, id: string): Promise<DBClients.Query.EntityLinkResult[]> {
            return this.links.getLinksByEntity(type, id)
        }
        deleteLink(left: DBClients.Query.EntityLinkReference, right: DBClients.Query.EntityLinkReference, version: number): Promise<void> {
            return this.links.deleteLink(left, right, version)
        }
    }

    export function open(name: string): Promise<InternalIDB> {
        return openDB<IndexedDBSchema.Schema>(name, 1, {
            upgrade(db) {
                // entities
                initializeStore(db, "entityIndex", IndexedDBSchema.Entity.entityIndices)
                initializeStore(db, "entityData", {})
                
                // properties
                initializeStore(db, "propertyIndex", IndexedDBSchema.Property.entityIndices)
                initializeStore(db, "propertyGlobal", IndexedDBSchema.Property.globalIndices)

                // full text
                initializeStore(db, "fullTextTerm", IndexedDBSchema.FullText.termIndices)
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
            for(const idx in indices) {
                const prop = indices[idx] as string | string[]
                store.createIndex(idx, prop, {multiEntry: true})
            }
        }
    }

    class EntityAdaptor {
        constructor(private db: InternalIDB) {}

        async listEntities(): Promise<IndexedDBSchema.Entity.EntityIndex[]> {
            return await this.entityIndex.allValues()
        }

        async exists(type: string, id: string): Promise<boolean> {
            const idx = await this.getIndex(type, id)
            const status = idx?.status ?? DBClients.EntityState.Deleted
            return status !== DBClients.EntityState.Deleted
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
            const entityIndices = IndexedDBSchema.Property.extractEntityIndices(type, id, properties)
            for(const entityIndex of entityIndices) {
                const propId = IndexedDBSchema.Property.entityId(entityIndex)
                await this.entity.put(propId, entityIndex)
                const globalAgg = IndexedDBSchema.Property.toAggregation(entityIndex)
                await this.globalAgg.put(globalAgg)
            }
        }

        async delete(type: string, id: string): Promise<void> {
            const entityIndices = await this.entity.getValuesByIndex("entity", `${type}_${id}`)
            for(const entityIndex of entityIndices) {
                const entityId = IndexedDBSchema.Property.entityId(entityIndex)
                const aggDoc = IndexedDBSchema.Property.toAggregation(entityIndex)
                await this.globalAgg.delete(aggDoc)
                await this.entity.delete(entityId)
            }
        }

        async queryEntities(type: string, propertyName: string, value: string): Promise<DBSearch.SearchResult[]> {
            const entities = await this.entity.getValuesByIndex("property", `${type}_${propertyName}_${value}`)
            return entities.map(it => ({
                id: it.id,
                type: it.type,
                weight: 1.0
            }))
        }

        async getPropertyValues(propertyCollection: string): Promise<string[]> {
            const results = await this.global.getValuesByIndex("propertyCollection", propertyCollection)
            return sortBy(results, it => -it.sum).map(it => it.value)
        }

        // db helpers
        private get entity() {
            return new DBWrapper(this.db, "propertyIndex", IndexedDBSchema.Property.entityIndices)
        }

        private get global() {
            return new DBWrapper(this.db, "propertyGlobal", IndexedDBSchema.Property.globalIndices)
        }

        private get globalAgg() {
            return new AggregationWrapper(this.global, IndexedDBSchema.Property.globalId)
        }
    }

    class FullTextAdaptor {
        constructor(private db: InternalIDB) {}

        async putEntity(type: string, id: string, terms: DBTokenize.IToken[]) {
            let totalWeight = 0
            const termIndices = IndexedDBSchema.FullText.extractTermIndices(type, id, terms)
            for(const termIndex of termIndices) {
                const termId = IndexedDBSchema.FullText.termId(termIndex)
                await this.term.put(termId, termIndex)
                const collectionAgg = IndexedDBSchema.FullText.toCollectionAggregation(termIndex)
                const globalAgg = IndexedDBSchema.FullText.toGlobalAggregation(termIndex)
                await this.collectionAgg.put(collectionAgg)
                await this.globalAgg.put(globalAgg)
                totalWeight += termIndex.weight
            }
            const docId = IndexedDBSchema.FullText.entityId(type, id)
            await this.entity.put(docId, {type, id, totalWeight})
        }

        async deleteEntity(type: string, id: string) {
            const termIndices = await this.term.getValuesByIndex("entity", `${type}_${id}`)
            for(const termIndex of termIndices) {
                const termId = IndexedDBSchema.FullText.termId(termIndex)
                const collectionAgg = IndexedDBSchema.FullText.toCollectionAggregation(termIndex)
                const globalAgg = IndexedDBSchema.FullText.toGlobalAggregation(termIndex)
                await this.collectionAgg.delete(collectionAgg)
                await this.globalAgg.delete(globalAgg)
                await this.term.delete(termId)
            }
            const docId = IndexedDBSchema.FullText.entityId(type, id)
            await this.entity.delete(docId)
        }

        async getEntitiesInCollection(type: string, term: string): Promise<DBSearch.SearchResult[]> {
            const result = await this.term.getValuesByIndex("collectionTerm", `${type}_${term}`)
            return result.map(it => ({type: it.type, id: it.id, weight: it.weight}))
        }

        async getEntitiesGlobal(term: string): Promise<DBSearch.SearchResult[]> {
            const result = await this.term.getValuesByIndex("globalTerm", term)
            return result.map(it => ({type: it.type, id: it.id, weight: it.weight}))
        }

        async getTermWeightsGlobal(term: string): Promise<number | null> {
            const docId = IndexedDBSchema.FullText.globalId(term)
            const result = await this.global.get(docId)
            return result?.sum ?? null
        }

        async getTermWeightsInCollection(type: string, term: string): Promise<number | null> {
            const docId = IndexedDBSchema.FullText.collectionId(type, term)
            const result = await this.collection.get(docId)
            return result?.sum ?? null
        }

        async getWeightsOfEntity(type: string, id: string): Promise<number | null> {
            const docId = IndexedDBSchema.FullText.entityId(type, id)
            const result = await this.entity.get(docId)
            return result?.totalWeight ?? null
        }

        // db helpers
        private get term() {
            return new DBWrapper(this.db, "fullTextTerm", IndexedDBSchema.FullText.termIndices)
        }

        private get entity() {
            return new DBWrapper(this.db, "fullTextEntity", IndexedDBSchema.FullText.entityIndices)
        }

        private get collection() {
            return new DBWrapper(this.db, "fullTextCollection", IndexedDBSchema.FullText.collectionIndices)
        }

        private get collectionAgg() {
            return new AggregationWrapper(this.collection, t => IndexedDBSchema.FullText.collectionId(t.type, t.term))
        }

        private get global() {
            return new DBWrapper(this.db, "fullTextGlobal", {})
        }

        private get globalAgg() {
            return new AggregationWrapper(this.global, t => IndexedDBSchema.FullText.globalId(t.term))
        }
    }

    class FilesAdaptor {
        constructor(private db: InternalIDB) {}

        async listFiles(): Promise<DBClients.FileIndex[]> {
            return await this.index.allValues()
        }

        async touchFile(name: string, version: number) {
            await this.patchFileIndex({
                name,
                status: DBClients.EntityState.Active,
                counts: 0,
                version
            })
        }

        async putContent(name: string, content: DBClients.FileContent): Promise<void> {
            await this.content.put(name, content)
        }

        async readIndex(name: string): Promise<IndexedDBSchema.Files.FileIndex | null> {
            return this.index.get(name)
        }

        async readFile(name: string): Promise<IndexedDBSchema.Files.FileContent | null> {
            return this.content.get(name)
        }

        async deleteFileContent(name: string) {
            await this.content.delete(name)
        }

        async deleteFile(name: string) {
            const idx = await this.index.get(name)
            if(idx === null) {
                console.warn(`File has already been deleted: ${name}`)
                return
            }
            if(idx.counts > 0) {
                throw new Error(`File is referred by some entities: ${name}`)
            }

            await this.patchFileIndex({
                name,
                status: DBClients.EntityState.Deleted,
                counts: 0
            })
            await this.deleteFileContent(name)
        }

        async putEntity(type: string, id: string, version: number, files: string[]) {
            for(const f of files) {
                await this.linkFile(type, id, version, f)
            }
        }

        async deleteEntity(type: string, id: string, version: number) {
            const files = await this.entity.getValuesByIndex("entity", `${type}_${id}`)
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
            const entityIndex = IndexedDBSchema.Files.toEntityIndex(type, id, fileName)
            await this.entity.put(entityId, entityIndex)
            await this.patchFileIndex({
                name: fileName,
                counts: 1,
                status: DBClients.EntityState.Active
            })
        }

        async unlinkFile(type: string, id: string, version: number, fileName: string) {
            const entityId = IndexedDBSchema.Files.entityId(type, id, fileName)
            const current = await this.entity.get(entityId)
            if(!current) {
                throw new Error(`File link not exists: ${type} ${id} ${fileName}`)
            }
            await this.entity.delete(entityId)
            await this.patchFileIndex({
                name: fileName, 
                counts: -1
            })
        }

        async purgeFiles() {
            const names = await this.index.getKeysByIndex("purging", `${DBClients.EntityState.Active}_${0}`)
            for(const n of names) {
                await this.deleteFile(n)
            }
        }

        private async patchFileIndex(options: {
            name: string,
            counts: number,
            status?: DBClients.EntityState,
            version?: number
        }) {
            const current = await this.index.get(options.name)
            const newCounts = (current?.counts ?? 0) + options.counts
            if(newCounts < 0) {
                throw new Error("counts < 0")
            }
            let version = options.version
            if(version === undefined) {
                if(!current) {
                    throw new Error(`Not exist: ${options.name}`)
                }
                version = current.version
            }
            let status = options.status
            if(status === undefined) {
                if(!current) {
                    throw new Error(`Not exist: ${options.name}`)
                }
                status = current.status
            }
            const newIndex = IndexedDBSchema.Files.createFileIndex({
                name: options.name,
                version,
                status,
                counts: newCounts
            })
            await this.index.put(options.name, newIndex)
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
            const docId = IndexedDBSchema.Links.linkId(biLink)
            const dbLink = IndexedDBSchema.Links.createLinkIndex(biLink, version, DBClients.EntityState.Active)

            await this.links.put(docId, dbLink)
            
            const ref = IndexedDBSchema.Links.createLinkNameIndex(dbLink, 1)
            await this.referenceAgg.put(ref)
        }

        async deleteLink(left: IndexedDBSchema.Links.LinkItem, right: IndexedDBSchema.Links.LinkItem, version: number): Promise<void> {
            const biLink = IndexedDBSchema.Links.createBiLink(left, right)
            const docId = IndexedDBSchema.Links.linkId(biLink)

            const dbLink = IndexedDBSchema.Links.createLinkIndex(biLink, version, DBClients.EntityState.Deleted)
            await this.links.put(docId, dbLink)

            const references = await this.referenceNames.getValuesByIndex("types", `${biLink.left.type}_${biLink.right.type}`)
            for(const ref of references) {
                await this.referenceAgg.delete(ref)
            }
        }

        async getLinksByEntity(type: string, id: string): Promise<IndexedDBSchema.Links.ClientLink[]> {
            const leftResults = await this.links.getValuesByIndex("left", `${type}_${id}_${DBClients.EntityState.Active}`)
            const rightResults = await this.links.getValuesByIndex("right", `${type}_${id}_${DBClients.EntityState.Active}`)
            const results = [...leftResults, ...rightResults]
            return results
                .map(it => IndexedDBSchema.Links.convertDBLinkToBiLink(it))
                .map(it => IndexedDBSchema.Links.convertBiLinkToClientLink(type, id, it))
        }

        async deleteEntity(type: string, id: string, version: number): Promise<void> {
            const leftResults = await this.links.getValuesByIndex("left", `${type}_${id}_${DBClients.EntityState.Active}`)
            const rightResults = await this.links.getValuesByIndex("right", `${type}_${id}_${DBClients.EntityState.Active}`)

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

        private get referenceAgg() {
            return new AggregationWrapper(this.referenceNames, IndexedDBSchema.Links.referenceId)
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

        async getKeysByIndex<Idx extends keyof IndexedDBSchema.Schema[Name]["indexes"]>(indexName: Idx, value: IndexKey<IndexedDBSchema.Schema, Name, Idx>): Promise<string[]> {
            const tx = this.db.transaction(this.name, "readonly")
            const result = await tx.store.index(indexName).getAllKeys(value)
            await tx.done
            return result ?? null
        }

        async getValuesByIndex<Idx extends keyof IndexedDBSchema.Schema[Name]["indexes"]>(indexName: Idx, value: IndexKey<IndexedDBSchema.Schema, Name, Idx>): Promise<IndexedDBSchema.Schema[Name]["value"][]> {
            const tx = this.db.transaction(this.name, "readonly")
            const result = await tx.store.index(indexName).getAll(value)
            await tx.done
            return result ?? null
        }
    }

    type AggNames = {[N in StoreNames]: IndexedDBSchema.Schema[N]["value"] extends {sum: number} ? N : never}[StoreNames]

    class AggregationWrapper<TName extends AggNames> {
        constructor(private backend: DBWrapper<TName>, private extractId: (entity: IndexedDBSchema.Schema[TName]["value"]) => string) {}

        async put(entity: IndexedDBSchema.Schema[TName]["value"]) {
            const aggId = this.extractId(entity)
            const current = await this.backend.get(aggId)
            if(current == null) {
                await this.backend.put(aggId, entity)
            }  else {
                await this.backend.put(aggId, {
                    ...entity,
                    sum: current.sum + entity.sum
                })
            }
        }

        async delete(entity: IndexedDBSchema.Schema[TName]["value"]) {
            const aggId = this.extractId(entity)
            const current = await this.backend.get(aggId)
            if(current == null) {
                throw new Error(`Not found: ${aggId}`)
            }
            const newCount = current.sum - entity.sum;
            if(newCount < 0) {
                throw new Error("count < 0")
            }
            const nextEntity: IndexedDBSchema.Schema[TName]["value"] = {
                ...entity,
                sum: newCount
            }
            if(nextEntity.sum > 0) {
                await this.backend.put(aggId, nextEntity)
            } else {
                await this.backend.delete(aggId)
            }
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
            const tx = this.db.transaction("fileContent", "readwrite")
            await tx.store.put(new Blob([content]), name)
            await tx.done
        }

        async delete(name: string) {
            const tx = this.db.transaction("fileContent", "readwrite")
            await tx.store.delete(name)
            await tx.done
        }
    }
}
