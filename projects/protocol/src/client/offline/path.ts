import {IOfflineClient} from "./base"

export module PathSyncClient {
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
                m[this.serializer(key)] = {key, ts: date.getTime()}
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

        private async updateIndex(updater: (index: MapIndex<string>) => void): Promise<void> {
            const data = await this.pathClient.read(this.paths.index())
            const index = data === null ? {} : await JsonUtils.fromJson<MapIndex<string>>(data)
            updater(index)
            const b = await JsonUtils.toJson(index)
            this.pathClient.write(this.paths.index(), b)
        }

        async getItem(id: string): Promise<T> {
            const data = await this.pathClient.read(this.paths.item(id))
            if(data === null) {
                throw new Error(`Item not exist: ${id}`)
            } else {
                return await JsonUtils.fromJson(data)
            }
        }
        async updateItem(id: string, value: T, updatedAt: Date): Promise<void> {
            const b = await JsonUtils.toJson(value)
            await this.pathClient.write(this.paths.item(id), b)
            await this.updateIndex(index => {
                index[id] = [id, updatedAt.getTime()]
            })
        }
        async deleteItem(id: string): Promise<void> {
            await this.pathClient.delete(this.paths.item(id))
            await this.updateIndex(index => {
                delete index[id]
            })
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

        private async updateIndex(updater: (index: MapIndex<Record<Keys, string>>) => void): Promise<void> {
            const data = await this.pathClient.read(this.paths.index())
            const index = data === null ? {} : await JsonUtils.fromJson<MapIndex<Record<Keys, string>>>(data)
            updater(index)
            const b = await JsonUtils.toJson(index)
            this.pathClient.write(this.paths.index(), b)
        }
        
        async getPayload(keys: Record<Keys, string>): Promise<Payload> {
            const data = await this.pathClient.read(this.paths.payload(keys))
            if(data === null) {
                throw new Error(`Relation not exist: ${JSON.stringify(keys)}`)
            } else {
                return await JsonUtils.fromJson(data)
            }
        }
        async putRelation(keys: Record<Keys, string>, payload: Payload, updatedAt: Date): Promise<void> {
            const b = await JsonUtils.toJson(payload)
            await this.pathClient.write(this.paths.payload(keys), b)
            await this.updateIndex(index => {
                const sKey = IOfflineClient.stringifyRelationKey(keys)
                index[sKey] = [keys, updatedAt.getTime()]
            })
        }
        async deleteRelation(keys: Record<Keys, string>): Promise<void> {
            await this.pathClient.delete(this.paths.payload(keys))
            await this.updateIndex(index => {
                const sKey = IOfflineClient.stringifyRelationKey(keys)
                delete index[sKey]
            })
        }
    }
}
