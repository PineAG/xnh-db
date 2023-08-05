import {DBClients} from "./client"

export module DBFileBackend {
    export interface IFileBackend {
        reader(): IFileReader
        writer(): IFileWriter
    }

    export interface IFileReader {
        read(name: string): Promise<Uint8Array | null>
    }

    export interface IFileWriter {
        write(name: string, value: Uint8Array): void
        delete(name: string): void
        commit(): Promise<void>
    }

    export interface BackendOptions {
        partitionPrefixLength: number
    }

    export class Backend  {
        constructor(private backend: IFileBackend, private options: BackendOptions) {}

        reader(): DBClients.FullSync.IReader {
            return new Reader(this.backend.reader(), this.options)
        }
        
        writer(): DBClients.FullSync.IWriter {
            return new Writer(this.backend.reader(), this.backend.writer(), this.options)
        }
    }

    class Reader implements DBClients.FullSync.IReader {
        private internal: ReaderAdaptor
        constructor(reader: IFileReader, options: BackendOptions) {
            this.internal = new ReaderAdaptor(reader, options.partitionPrefixLength)
        }

        async readStoreState(): Promise<DBClients.FullSync.StoreState> {
            const [entities, files, links] = await Promise.all([
                this.internal.readEntityIndex(),
                this.internal.readFileIndex(),
                this.internal.readLinkIndex()
            ])
            return {
                entities: Object.values(entities),
                files: Object.values(files),
                links: Object.values(links)
            }
        }

        async readEntity(type: string, id: string): Promise<{}> {
            const content = await this.internal.readEntityContent(type, id)
            if(!content) {
                throw new Error(`Entity not found: ${type} ${id}`)
            }
            return content
        }

        async readFile(name: string): Promise<Uint8Array> {
            const content = await this.internal.readFileContent(name)
            if(!content) {
                throw new Error(`Blob not found: ${name}`)
            }
            return content
        }
    }

    class Writer implements DBClients.FullSync.IWriter {
        constructor(private reader: IFileReader, private writer: IFileWriter, private options: BackendOptions) {
        }

        async *performActions(actions: DBClients.FullSync.Actions.ActionCollection, lazyFileContent: boolean): AsyncGenerator<DBClients.FullSync.Actions.ActionBase> {
            const writer = new WriterAdaptor(this.reader, this.writer, this.options.partitionPrefixLength)

            for(const action of actions.deleteLink) {
                await writer.putLinkIndex({
                    status: DBClients.EntityState.Deleted, 
                    version: action.options.version,
                    left: action.options.left,
                    right: action.options.right
                })
                yield action
            }

            for(const action of actions.putLink) {
                await writer.putLinkIndex({
                    status: DBClients.EntityState.Active, 
                    version: action.options.version,
                    left: action.options.left,
                    right: action.options.right
                })
                yield action
            }

            for(const action of actions.deleteEntity) {
                await writer.deleteEntityContent(action.options.type, action.options.id)
                await writer.putEntityIndex({
                    status: DBClients.EntityState.Deleted,
                    id: action.options.id,
                    type: action.options.type,
                    version: action.options.version
                })
                yield action
            }

            for(const action of actions.putEntity) {
                const entity = await action.options.readEntity()
                await writer.writeEntityContent(action.options.type, action.options.id, entity)
                await writer.putEntityIndex({
                    status: DBClients.EntityState.Active,
                    id: action.options.id,
                    type: action.options.type,
                    version: action.options.version
                })
                yield action
            }

            for(const action of actions.deleteEntity) {
                await writer.deleteEntityContent(action.options.type, action.options.id)
                await writer.putEntityIndex({
                    status: DBClients.EntityState.Deleted,
                    id: action.options.id,
                    type: action.options.type,
                    version: action.options.version
                })
                yield action
            }

            for(const action of actions.putFile) {
                if(lazyFileContent) {
                    writer.deleteFileContent(action.options.fileName)
                } else {
                    const content = await action.options.readContent()
                    writer.writeFileContent(action.options.fileName, content)
                }
                writer.putFileIndex({
                    status: DBClients.EntityState.Active,
                    name: action.options.fileName,
                    version: action.options.version
                })
                yield action
            }

            for(const action of actions.deleteFile) {
                writer.deleteFileContent(action.options.fileName)
                await writer.putFileIndex({
                    status: DBClients.EntityState.Deleted,
                    name: action.options.fileName,
                    version: action.options.version
                })
                yield action
            }

            writer.commit()
            await this.writer.commit()
        }
    }

    type EntityPartitionContent = Record<string, {}>
    type EntityIndexContent = Record<string, DBClients.EntityIndex>
    type LinkIndexContent = Record<string, DBClients.Query.EntityLink>
    type FileIndexContent = Record<string, DBClients.FileIndex>

    class ReaderAdaptor {
        private reader: IFileReader

        constructor(reader: IFileReader, private partitionPrefixLen: number) {
            this.reader = new CachedReader(reader)
        }

        async readEntityIndex(): Promise<EntityIndexContent> {
            return await this.readFile<EntityIndexContent>(entityIndexName) ?? {}
        }

        async readFileIndex(): Promise<FileIndexContent> {
            return await this.readFile<FileIndexContent>(blobIndexName) ?? {}
        }

        async readLinkIndex(): Promise<LinkIndexContent> {
            return await this.readFile<LinkIndexContent>(linkIndexName) ?? {}
        }

        async readEntityContent(type: string, id: string): Promise<{} | null> {
            const fp = entityPartitionFileName(type, id, this.partitionPrefixLen)
            const content = await this.readFile<EntityPartitionContent>(fp)
            if(!content) {
                return null
            }
            return content[id] ?? null
        }

        async readFileContent(name: string): Promise<Uint8Array> {
            const content = await this.reader.read(blobFileName(name))
            if(content == null) {
                throw new Error(`Blob not found: ${name}`)
            }
            return content
        }

        private async readFile<T>(name: string): Promise<T | null> {
            const content = await this.reader.read(name)
            if(content == null) {
                return null
            }
            const text = new TextDecoder().decode(content)
            return JSON.parse(text)
        }
    }

    class WriterAdaptor {
        private readerAdaptor: ReaderAdaptor
        private entityIndex: EntityIndexContent | null = null
        private linkIndex: LinkIndexContent | null = null
        private fileIndex: FileIndexContent | null = null
        private entityPartitions: Record<string, EntityPartitionContent> = {}
        private blobs: Record<string, Uint8Array> = {}
        private deleteBlobs = new Set<string>()

        constructor(private reader: IFileReader, private writer: IFileWriter, private partitionPrefixLen: number) {
            this.readerAdaptor = new ReaderAdaptor(reader, partitionPrefixLen)
        }

        async putEntityIndex(index: DBClients.EntityIndex) {
            if(!this.entityIndex) {
                this.entityIndex = await this.readerAdaptor.readEntityIndex()
            }
            const id = ItemId.entityId(index.type, index.id)
            this.entityIndex[id] = index
        }

        async putFileIndex(index: DBClients.FileIndex) {
            if(!this.fileIndex) {
                this.fileIndex = await this.readerAdaptor.readFileIndex()
            }
            this.fileIndex[index.name] = index
        }

        async putLinkIndex(index: DBClients.Query.EntityLink) {
            if(!this.linkIndex) {
                this.linkIndex = await this.readerAdaptor.readLinkIndex()
            }
            const id = ItemId.linkId(index)
            this.linkIndex[id] = index
        }

        async writeEntityContent(type: string, id: string, entity: {}) {
            const partition = await this.getPartition(type, id)
            partition[id] = entity
        }

        async deleteEntityContent(type: string, id: string) {
            const partition = await this.getPartition(type, id)
            delete partition[id]   
        }

        private async getPartition(type: string, id: string): Promise<EntityPartitionContent> {
            const fp = entityPartitionFileName(type, id, this.partitionPrefixLen)
            let partition: EntityPartitionContent
            if(fp in this.entityPartitions) {
                partition = this.entityPartitions[fp]
            } else {
                const data = await this.readFile<EntityPartitionContent>(fp)
                partition = data ?? {}
                this.entityPartitions[fp] = partition
            }
            return partition
        }

        writeFileContent(name: string, blob: Uint8Array) {
            this.blobs[name] = blob
        }

        deleteFileContent(name: string) {
            this.deleteBlobs.add(name)
        }

        commit() {
            if(!this.entityIndex || !this.linkIndex || !this.fileIndex) {
                throw new Error("Adaptor not initialized.")
            }
            for(const [fp, blob] of Object.entries(this.blobs)) {
                this.writer.write(fp, blob)
            }
            for(const fp of this.deleteBlobs) {
                this.writer.delete(fp)
            }
            for(const [fp, content] of Object.entries(this.entityPartitions)) {
                if(Object.keys(content).length === 0) {
                    this.writer.delete(fp)
                } else {
                    this.writeFile(fp, content)
                }
            }
            this.writeFile(entityIndexName, this.entityIndex)
            this.writeFile(linkIndexName, this.linkIndex)
            this.writeFile(blobIndexName, this.fileIndex)
        }

        private async readFile<T>(name: string): Promise<T | null> {
            const content = await this.reader.read(name)
            if(content == null) {
                return null
            }
            const text = new TextDecoder().decode(content)
            return JSON.parse(text)
        }

        private writeFile(name: string, content: any) {
            const text = JSON.stringify(content)
            const blob = new TextEncoder().encode(text)
            this.writer.write(name, blob)
        }
    }

    type CacheItem = {exists: true, blob: Uint8Array} | {exists: false}

    export class CachedReader implements IFileReader {
        private cache = new Map<string, CacheItem>()

        constructor(private internal: IFileReader) {}

        async read(name: string): Promise<Uint8Array | null> {
            const item = this.cache.get(name)
            if(item) {
                return item.exists ? item.blob : null
            } else {
                const content = await this.internal.read(name)
                this.cache.set(name, content ? {exists: true, blob: content} : {exists: false})
                return content
            }
        }
    }

    function entityPartitionFileName(type: string, id: string, prefixLen: number) {
        return `entity_${type}_${id.slice(0, prefixLen)}.json`
    }

    function blobFileName(name: string) {
        return `blob_${name}`
    }

    const entityIndexName = "entity_index.json"
    const blobIndexName = "blob_index.json"
    const linkIndexName = "links_index.json"

    module ItemId {
        export function entityId(type: string, id: string) {
            return `${type}_${id}`
        }

        export function linkId(link: DBClients.Query.EntityLink) {
            return `${link.left.type}_${link.left.id}_${link.left.referenceName}__${link.right.type}_${link.right.id}_${link.right.referenceName}`
        }
    }

    export module MemoryAdaptor {
        export class Backend implements IFileBackend {
            private store = new Map<string, Uint8Array>()
            constructor() {}

            reader(): IFileReader {
                return new FileReader(this.store)
            }
            
            writer(): IFileWriter {
                return new FileWriter(this.store)
            }
        }

        export class FileReader implements IFileReader {
            constructor(private store: Map<string, Uint8Array>) {}

            async read(name: string): Promise<Uint8Array | null> {
                return this.store.get(name) ?? null
            }
        }

        export class FileWriter implements IFileWriter {
            constructor(private store: Map<string, Uint8Array>) {}

            write(name: string, value: Uint8Array): void {
                this.store.set(name, value)
            }
            delete(name: string): void {
                this.store.delete(name)
            }

            async commit(): Promise<void> {
                // pass
            }
        }
    }
}
