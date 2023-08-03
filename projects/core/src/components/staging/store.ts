import { DBClients, DBConfig } from "@xnh-db/common";
import { observable, action, makeAutoObservable, ObservableMap, toJS } from "mobx";

export module StagingStore {
    
    export interface StagingStoreOptions {
        backend: DBClients.Query.IClient
        fallbackBackend: DBClients.FullSync.IReader
    }

    export enum DataStatus {
        Pending = "pending",
        Active = "active",
        Deleted = "deleted",
        Failure = "failure"
    }

    type DataWrapperOptions<T, TId> = {
        pending: {}
        deleted: {version: number, id: TId}
        active: {data: T, version: number, id: TId}
        failure: {message: string, id: TId}
    }

    export type DataWrapper<T, TId> = {
        [K in DataStatus]: {status: K} & DataWrapperOptions<T, TId>[K]
    }[DataStatus]

    export module Wrappers {
        export interface EntityId {
            type: string
            id: string
        }
        export type Entity = DataWrapper<{}, EntityId>

        export type Link = DataWrapper<DBClients.Query.EntityLinkPair, DBClients.Query.EntityLinkPair>
        export type LinkCollection = DataWrapper<DBClients.Query.EntityLinkResult[], EntityId>

        export type File = DataWrapper<DBClients.FileContent, string>
    }

    export class Store implements DBClients.FullSync.IReader {
        @observable private entities = observable.map<string, Wrappers.Entity>()
        @observable private files = observable.map<string, Wrappers.File>()
        @observable private links = observable.map<string, Wrappers.Link>()

        constructor(private options: StagingStoreOptions) {
            makeAutoObservable(this)
        }

        @action clear() {
            this.entities.clear()
            this.files.clear()
            this.links.clear()
        }

        // entities
        entity<T>(type: string, id: string): Wrappers.Entity {
            const result = this.getEntity(type, id)
            if(result) {
                return result as Wrappers.Entity
            }
            this.fetchEntity(type, id)
            return {status: DataStatus.Pending}
        }

        putEntity<T>(type: string, id: string, version: number, data: T) {
            this.setEntity(type, id, {status: DataStatus.Active, version, data: data as {}, id: {type, id}})
        }

        deleteEntity(type: string, id: string, version: number) {
            for(const link of this.links.values()) {
                if(link.status === DataStatus.Active && entityHasLink(type, id, link.data.left, link.data.right)) {
                    this.deleteLinkInternal(link.data.left, link.data.right, link.version)
                }
            }
            this.setEntity(type, id, {status: DataStatus.Deleted, version, id: {type, id}})
        }

        private async fetchEntity(type: string, id: string) {
            this.setEntity(type, id, {status: DataStatus.Pending})
            let meta: DBClients.EntityIndex | null
            let data: {} | null = null
            try {
                meta = await this.options.backend.getEntityIndex(type, id)
                if(meta?.status === DBClients.EntityState.Active) {
                    data = await this.options.backend.getEntityContent(type, id)
                    await this.fetchLinksOf(type, id)
                }
            } catch(ex) {
                this.setEntity(type, id, {status: DataStatus.Failure, message: `${ex}`, id: {type, id}})
                return;
            }
            if(meta?.status === DBClients.EntityState.Active) {
                if(!data) {
                    throw new Error(`Missing content: ${type} ${id}`)
                }
                this.setEntity(type, id, {status: DataStatus.Active, data, version: meta.version, id: {type, id}})
            } else {
                this.setEntity(type, id, {status: DataStatus.Deleted, version: meta?.version ?? -1, id: {type, id}})
            }
        }

        private getEntity(type: string, id: string): Wrappers.Entity | null {
            const entityKey = entityId(type, id)
            const result = this.entities.get(entityKey)
            return result ?? null
        }

        @action private setEntity(type: string, id: string, result: Wrappers.Entity) {
            const entityKey = entityId(type, id)
            this.entities.set(entityKey, result)
        }

        // link
        linksOf(type: string, id: string): Wrappers.LinkCollection {
            const entity = this.getEntity(type, id)
            if(!entity) {
                this.fetchEntity(type, id)
                return {status: DataStatus.Pending}
            } else if (entity.status === DataStatus.Active) {
                const links = this.getLinksOf(type, id)
                return {status: DataStatus.Active, version: entity.version, data: links, id: {type, id}}
            } else {
                return entity
            }
        }

        addLink(link: DBClients.Query.EntityLinkResult, version: number) {
            let left = link.self
            let right = link.opposite
            if(shouldReverseLink(left, right)) {
                [right, left] = [left, right]
            }
            const id = linkId(link.opposite, link.self)
            const out: DBClients.Query.EntityLinkPair = {left, right}

            this.links.set(id, {status: DataStatus.Active, data: out, version, id: out})
        }

        deleteLink(link: DBClients.Query.EntityLinkResult, version: number) {
            let left = link.self
            let right = link.opposite
            if(shouldReverseLink(left, right)) {
                [right, left] = [left, right]
            }

            this.deleteLinkInternal(left, right, version)
        }

        private async fetchLinksOf(type: string, id: string) {
            const links = await this.options.backend.getLinksOfEntity(type, id)
            for(const link of links) {
                let left = link.self
                let right = link.opposite
                if(shouldReverseLink(left, right)) {
                    [right, left] = [left, right]
                }

                const id = linkId(link.opposite, link.self)
                const out: DBClients.Query.EntityLinkPair = {left, right}
                this.links.set(id, {status: DataStatus.Active, data: out, version: link.version, id: out})
            }
        }

        private getLinksOf(type: string, id: string): DBClients.Query.EntityLinkResult[] {
            const result: DBClients.Query.EntityLinkResult[] = []
            for(const it of this.links.values()) {
                if(it.status !== DataStatus.Active) {
                    continue;
                }
                const link = it.data
                if(link.left.type === type && link.left.id === id) {
                    result.push({
                        self: link.left,
                        opposite: link.right,
                        version: it.version
                    })
                } else if (link.right.type === type && link.right.id === id) {
                    result.push({
                        self: link.right,
                        opposite: link.left,
                        version: it.version
                    })
                }
            }
            return result
        }

        private deleteLinkInternal(left: DBClients.Query.EntityLinkReference, right: DBClients.Query.EntityLinkReference, version: number) {
            if(shouldReverseLink(left, right)) {
                [right, left] = [left, right]
            }
            const id = linkId(left, right)
            this.links.set(id, {
                status: DataStatus.Deleted,
                id: {left, right},
                version
            })
        }

        // file
        file(name: string): Wrappers.File {
            const current = this.getFile(name)
            if(current) {
                return current
            }
            this.fetchFile(name)
            return {status: DataStatus.Pending}
        }

        putFile(name: string, version: number, content: DBClients.FileContent) {
            this.files.set(name, {status: DataStatus.Active, version, data: content, id: name})
        }

        deleteFile(name: string, version: number) {
            this.files.set(name, {status: DataStatus.Deleted, version, id: name})
        }

        async fetchFile(name: string) {
            let meta: DBClients.FileIndex | null = null
            let content: DBClients.FileContent | null = null
            this.setFile(name, {status: DataStatus.Pending})
            try {
                meta = await this.options.backend.getFileMeta(name)
                if(meta?.status === DBClients.EntityState.Active) {
                    content = await this.options.backend.readFile(name)
                    if(!content) {
                        content = await this.options.fallbackBackend.readFile(name)
                        await this.options.backend.writeFileContent(name, content)
                    }
                    if(!content) {
                        throw new Error(`File not found: ${name}`)
                    }
                }
            } catch(ex) {
                this.files.set(name, {status: DataStatus.Failure, message: `${ex}`, id: name})
                return;
            }
            if(meta?.status === DBClients.EntityState.Active) {
                if(!content) {
                    throw new Error("This should not happen.")
                }
                this.files.set(name, {status: DataStatus.Active, data: content, version: meta.version, id: name})
            } else {
                this.files.set(name, {status: DataStatus.Deleted, version: meta?.version ?? -1, id: name})
            }
        }

        private getFile(name: string): Wrappers.File | null {
            const result = this.files.get(name)
            return result ?? null
        }

        @action private setFile(name: string, content: Wrappers.File) {
            this.files.set(name, content)
        }

        // IReader
        async readStoreState(): Promise<DBClients.FullSync.StoreState> {
            const entities: DBClients.EntityIndex[] = []
            const files: DBClients.FileIndex[] = []
            const links: DBClients.Query.EntityLink[] = []

            for(const entity of this.entities.values()) {
                if(entity.status === DataStatus.Active) {
                    const id = entity.id
                    entities.push({
                        type: id.type,
                        id: id.id,
                        status: DBClients.EntityState.Active,
                        version: entity.version
                    })
                } else if(entity.status === DataStatus.Deleted) {
                    const id = entity.id
                    entities.push({
                        type: id.type,
                        id: id.id,
                        status: DBClients.EntityState.Deleted,
                        version: entity.version
                    })
                } else {
                    console.warn(entity)
                }
            }

            for(const file of this.files.values()) {
                if(file.status === DataStatus.Active) {
                    files.push({
                        name: file.id,
                        status: DBClients.EntityState.Active,
                        version: file.version
                    })
                } else if(file.status === DataStatus.Deleted) {
                    files.push({
                        name: file.id,
                        status: DBClients.EntityState.Deleted,
                        version: file.version
                    })
                } else {
                    console.warn(file)
                }
            }

            for(const link of this.links.values()) {
                if(link.status === DataStatus.Active) {
                    const {left, right} = link.data
                    links.push({
                        left: toJS(left), right: toJS(right),
                        status: DBClients.EntityState.Active,
                        version: link.version
                    })
                } else if (link.status === DataStatus.Deleted) {
                    const {left, right} = link.id
                    links.push({
                        left: toJS(left), right: toJS(right),
                        status: DBClients.EntityState.Active,
                        version: link.version
                    })
                } else {
                    console.warn(link)
                }
            }

            return {entities, files, links}
        }

        async readEntity(type: string, id: string): Promise<{}> {
            const result = this.getEntity(type, id)
            if(result?.status === DataStatus.Active) {
                return toJS(result.data)
            } else {
                throw new Error(`Entity not available: ${type} ${id}`)
            }
        }

        async readFile(name: string): Promise<Uint8Array> {
            const content = this.files.get(name)
            if(content?.status === DataStatus.Active) {
                return toJS(content.data)
            } else {
                throw new Error(`File not available: ${name}`)
            }
        }
    }

    function shouldReverseLink(left: DBClients.Query.EntityLinkReference, right: DBClients.Query.EntityLinkReference): boolean {
        if(left.type > right.type) {
            return true
        }
        if(left.referenceName > right.referenceName) {
            return true
        }
        if(left.id > right.id) {
            return true
        }
        return false
    }
    
    function entityId(type: string, id: string): string {
        return `${type}:${id}`
    }

    function entityHasLink(type: string, id: string, left: DBClients.Query.EntityLinkReference, right: DBClients.Query.EntityLinkReference): boolean {
        return (type === left.type && id === left.id) || (type === right.type && id === right.id)
    }

    function linkId(left: DBClients.Query.EntityLinkReference, right: DBClients.Query.EntityLinkReference): string {
        return `${left.type}_${left.id}_${left.referenceName}:${right.type}_${right.id}_${right.referenceName}`
    }
}