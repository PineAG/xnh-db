import { DeepPartial } from "utility-types"
import { IOfflineClient } from "./base"

export module OfflinePathClientUtils {
    module JsonUtils {
        export async function fromJson<T>(data: Blob): Promise<T> {
            const b = await data.arrayBuffer()
            const t = new TextDecoder().decode(b)
            return JSON.parse(t)
        }
        
        export async function toJson<T>(obj: T): Promise<Blob> {
            const t = JSON.stringify(obj, null, 1)
            const b = new TextEncoder().encode(t)
            return new Blob([b])
        }
    }

    type MapIndex<Key> = Record<string, [Key, number]> 

    class MapIndexHelper<Key> {
        constructor(private serializer: (k: Key) => string) {}

        arrayToMap(a: IOfflineClient.CollectionIndex<Key>): MapIndex<Key> {
            const m = {}
            for(const {key, date} of a) {
                m[this.serializer(key)] = [key, date.getTime()]
            }
            return m
        }

        mapToArray(m: MapIndex<Key>): IOfflineClient.CollectionIndex<Key> {
            const a = []
            for(const [key, ts] of Object.values(m)) {
                a.push({key, date: new Date(ts)})
            }
            return a
        }
    }

    export interface IPathClient {
        read(path: string): Promise<Blob | null>
        write(path: string, value: Blob): Promise<void>
        delete(path: string): Promise<void>
    }

    class CollectionPathHelper {
        index(): string {
            return "index.json"
        }

        item(id: string): string {
            return `items/${id}.json`
        }

        status(): string {
            return "status.json"
        }
    }

    interface SerializedStatus {
        updatedAt: number
    }

    export class Collection<T> implements IOfflineClient.Collection<T> {
        private paths = new CollectionPathHelper()
        private idxCvt = new MapIndexHelper<string>(it => it)
        constructor(protected pathClient: IPathClient) {}

        async getIndex(): Promise<IOfflineClient.CollectionIndex<string>> {
            const data = await this.pathClient.read(this.paths.index())
            if(data === null) {
                return []
            } else {
                const m = await JsonUtils.fromJson<MapIndex<string>>(data)
                return this.idxCvt.mapToArray(m)
            }
        }

        async flushIndex(index: IOfflineClient.CollectionIndex<string>): Promise<void> {
            const map = this.idxCvt.arrayToMap(index)
            const json = await JsonUtils.toJson(map)
            await this.pathClient.write(this.paths.index(), json)
        }

        async getItem(id: string): Promise<DeepPartial<T>> {
            const data = await this.pathClient.read(this.paths.item(id))
            if(data === null) {
                throw new Error(`Item not exist: ${id}`)
            } else {
                return await JsonUtils.fromJson(data)
            }
        }
        async updateItem(id: string, value: DeepPartial<T>): Promise<void> {
            const b = await JsonUtils.toJson(value)
            await this.pathClient.write(this.paths.item(id), b)
        }
        async deleteItem(id: string): Promise<void> {
            await this.pathClient.delete(this.paths.item(id))
        }
        async getStatus(): Promise<IOfflineClient.LatestStatus> {
            const b = await this.pathClient.read(this.paths.status())
            if(!b) {
                return {
                    updatedAt: new Date(0)
                }
            }
            const data: SerializedStatus = await JsonUtils.fromJson(b)
            return {
                updatedAt: new Date(data.updatedAt)
            }
        }
        async setStatus(status: IOfflineClient.LatestStatus): Promise<void> {
            const data: SerializedStatus = {
                updatedAt: status.updatedAt.getTime()
            }
            const b = await JsonUtils.toJson(data)
            await this.pathClient.write(this.paths.status(), b)
        }
    }

    class RelationPathHelper<Keys extends string> {
        index(): string {
            return "index.json"
        }

        payload(keys: Record<Keys, string>): string {
            const key = IOfflineClient.stringifyRelationKey(keys)
            return `payloads/${key}.json`
        }

        status(): string {
            return "status.json"
        }
    }

    export class Relation<Keys extends string, Payload> implements IOfflineClient.Relation<Keys, Payload> {
        private paths = new RelationPathHelper<Keys>
        private idxCvt = new MapIndexHelper<Record<Keys, string>>(IOfflineClient.stringifyRelationKey)
        constructor(protected pathClient: IPathClient) {}

        async getIndex(): Promise<IOfflineClient.CollectionIndex<Record<Keys, string>>> {
            const data = await this.pathClient.read(this.paths.index())
            if(data === null) {
                return []
            } else {
                const m = await JsonUtils.fromJson<MapIndex<Record<Keys, string>>>(data)
                return this.idxCvt.mapToArray(m)
            }
        }

        async flushIndex(index: IOfflineClient.CollectionIndex<Record<Keys, string>>): Promise<void> {
            const map = this.idxCvt.arrayToMap(index)
            const json = await JsonUtils.toJson(map)
            await this.pathClient.write(this.paths.index(), json)
        }
        
        async getPayload(keys: Record<Keys, string>): Promise<Payload> {
            const data = await this.pathClient.read(this.paths.payload(keys))
            if(data === null) {
                throw new Error(`Relation not exist: ${JSON.stringify(keys)}`)
            } else {
                return await JsonUtils.fromJson(data)
            }
        }
        async updateRelation(keys: Record<Keys, string>, payload: Payload): Promise<void> {
            const b = await JsonUtils.toJson(payload)
            await this.pathClient.write(this.paths.payload(keys), b)
        }
        async deleteRelation(keys: Record<Keys, string>): Promise<void> {
            await this.pathClient.delete(this.paths.payload(keys))
        }
        async getStatus(): Promise<IOfflineClient.LatestStatus> {
            const b = await this.pathClient.read(this.paths.status())
            if(!b) {
                return {
                    updatedAt: new Date(0)
                }
            }
            const data: SerializedStatus = await JsonUtils.fromJson(b)
            return {
                updatedAt: new Date(data.updatedAt)
            }
        }
        async setStatus(status: IOfflineClient.LatestStatus): Promise<void> {
            const data: SerializedStatus = {
                updatedAt: status.updatedAt.getTime()
            }
            const b = await JsonUtils.toJson(data)
            await this.pathClient.write(this.paths.status(), b)
        }
    }

    export class Files implements IOfflineClient.Files {
        private readonly statusFile = "status.json"
        private readonly indexFile = "index.json"
        private idxCvt = new MapIndexHelper<string>(it => it)

        constructor(private pathClient: IPathClient) {}

        async getStatus(): Promise<IOfflineClient.LatestStatus> {
            const b = await this.pathClient.read(this.statusFile)
            if(!b) {
                return {
                    updatedAt: new Date(0)
                }
            }
            const data: SerializedStatus = await JsonUtils.fromJson(b)
            return {
                updatedAt: new Date(data.updatedAt)
            }
        }
        async setStatus(status: IOfflineClient.LatestStatus): Promise<void> {
            const data: SerializedStatus = {
                updatedAt: status.updatedAt.getTime()
            }
            const b = await JsonUtils.toJson(data)
            await this.pathClient.write(this.statusFile, b)
        }
        async getIndex(): Promise<IOfflineClient.CollectionIndex<string>> {
            const data = await this.pathClient.read(this.indexFile)
            if(data === null) {
                return []
            } else {
                const m = await JsonUtils.fromJson<MapIndex<string>>(data)
                return this.idxCvt.mapToArray(m)
            }
        }

        async flushIndex(index: IOfflineClient.CollectionIndex<string>): Promise<void> {
            const map = this.idxCvt.arrayToMap(index)
            const json = await JsonUtils.toJson(map)
            await this.pathClient.write(this.indexFile, json)
        }

        async read(name: string): Promise<Blob> {
            const b = await this.pathClient.read(name)
            if(!b) {
                throw new Error(`File not exist: ${name}`)
            }
            return b
        }
        async write(name: string, value: Blob): Promise<void> {
            await this.pathClient.write(name, value)
        }
        async delete(name: string): Promise<void> {
            await this.pathClient.delete(name)
        }
        
    }
}