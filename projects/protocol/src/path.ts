import { CollectionIndex, ICollectionClient, IRelationClient } from "./client"
import { createTwoWayRelationAdapters, TwoWayRelationBinder } from "./two-way"

export interface IPathClient {
    read(path: string[]): Promise<Blob | null>
    write(path: string[], value: Blob): Promise<void>
    delete(path: string[]): Promise<void>
}

module JsonUtils {
    export async function fromJson<T>(data: Blob): Promise<T> {
        const b = await data.arrayBuffer()
        const t = new TextDecoder().decode(b)
        return JSON.parse(t)
    }
    
    export async function toJson<T>(obj: T): Promise<Blob> {
        const t = JSON.stringify(obj)
        const b = new TextEncoder().encode(t)
        return new Blob([b])
    }
}

module CollectionIndexUtils {
    export async function toJson(obj: CollectionIndex): Promise<Blob> {
        return JsonUtils.toJson(
            Object.fromEntries(
                Object.entries(obj).map(
                    ([k, v]) => ([k, v.getTime()])
                )))
    }

    export async function fromJson(data: Blob): Promise<CollectionIndex> {
        const obj = await JsonUtils.fromJson(data)
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => ([k, new Date(v)])))
    }
}


export class CollectionPathClient<T> implements ICollectionClient<T> {
    constructor(protected pathClient: IPathClient) {}
    
    async getIndex(): Promise<CollectionIndex> {
        const data = await this.pathClient.read(['index.json'])
        if(data === null) {
            return {}
        }
        return await CollectionIndexUtils.fromJson(data)
    }

    async getItem(id: string): Promise<T> {
        const data = await this.pathClient.read(['items', `${id}.json`])
        if(data === null) {
            throw new Error(`Not found: ${id}`)
        }
        return await JsonUtils.fromJson(data)
    }

    async updateItem(id: string, value: T, updatedAt: Date): Promise<void> {
        const index = await this.getIndex()
        await this.pathClient.write(['items', `${id}.json`], await JsonUtils.toJson(value))
        index[id] = updatedAt
        await this.setIndex(index)
    }

    async deleteItem(id: string): Promise<void> {
        const index = await this.getIndex()
        await this.pathClient.delete(['items', `${id}.json`])
        delete index[id]
        await this.setIndex(index)
    }

    private async setIndex(index: CollectionIndex): Promise<void> {
        await this.pathClient.write(['index.json'], await CollectionIndexUtils.toJson(index))
    }
}

class UnsafeRelationPathClient implements IRelationClient {
    constructor(private pathClient: IPathClient){}

    async getIndex(): Promise<CollectionIndex> {
        const data = await this.pathClient.read(['index.json'])
        if(data === null) {
            return {}
        }
        return await CollectionIndexUtils.fromJson(data)
    }

    async getTargetsById(id: string): Promise<string[]> {
        const data = await this.pathClient.read(['rel', `${id}.json`])
        if(data === null) {
            return []
        }
        return await JsonUtils.fromJson(data)
    }

    async linkToTarget(id: string, targetId: string, updateAt: Date): Promise<void> {
        const data = await this.pathClient.read(['rel', `${id}.json`])
        const list = data === null ? [] : (await JsonUtils.fromJson<string[]>(data))
        if(!list.includes(targetId)) {
            list.push(targetId)
            const b = await JsonUtils.toJson(list)
            await this.pathClient.write(['rel', `${id}.json`], b)
        }
    }

    async unlinkTarget(id: string, targetId: string, updateAt: Date): Promise<void> {
        const data = await this.pathClient.read(['rel', `${id}.json`])
        const list = data === null ? [] : (await JsonUtils.fromJson<string[]>(data))
        const newList = list.filter(id => id !== targetId)
        if(newList.length === 0) {
            await this.pathClient.delete(['rel', `${id}.json`])
        } else {
            const b = await JsonUtils.toJson(newList)
            await this.pathClient.write(['rel', `${id}.json`], b)
        }
    }

    async unlinkAllTargetsById(id: string): Promise<void> {
        await this.pathClient.delete(['rel', `${id}.json`])
    }
}

export function createPathRelationClients(leftPath: IPathClient, rightPath: IPathClient): [IRelationClient, IRelationClient] {
    const leftClient = new UnsafeRelationPathClient(leftPath)
    const rightClient = new UnsafeRelationPathClient(rightPath)
    const twoWay = new TwoWayRelationBinder(leftClient, rightClient)
    return createTwoWayRelationAdapters(twoWay)
}
