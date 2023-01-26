import { CollectionIndex, FullTextReference, ICollectionClient, IFullTextClient, IRelationClient, KeywordsWithWeights } from "./base"
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

class UnsafeRelationPathClient<Payload> implements IRelationClient<Payload> {
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
        const index = await this.getIndex()
        const data = await this.pathClient.read(['rel', `${id}.json`])
        const list = data === null ? [] : (await JsonUtils.fromJson<string[]>(data))
        if(!list.includes(targetId)) {
            list.push(targetId)
            const b = await JsonUtils.toJson(list)
            await this.pathClient.write(['rel', `${id}.json`], b)
            index[id] = updateAt
            await this.setIndex(index)
        }
    }

    async unlinkTarget(id: string, targetId: string, updateAt: Date): Promise<void> {
        const index = await this.getIndex()
        const data = await this.pathClient.read(['rel', `${id}.json`])
        const list = data === null ? [] : (await JsonUtils.fromJson<string[]>(data))
        const newList = list.filter(id => id !== targetId)
        if(newList.length === 0) {
            index[id] = updateAt
            await this.pathClient.delete(['rel', `${id}.json`])
        } else {
            const b = await JsonUtils.toJson(newList)
            await this.pathClient.write(['rel', `${id}.json`], b)
            delete index[id]
        }
        await this.setIndex(index)
    }

    async unlinkAllTargetsById(id: string): Promise<void> {
        const index = await this.getIndex()
        await this.pathClient.delete(['rel', `${id}.json`])
        delete index[id]
        await this.setIndex(index)
    }
    
    private async setIndex(index: CollectionIndex): Promise<void> {
        await this.pathClient.write(['index.json'], await CollectionIndexUtils.toJson(index))
    }
}

export function createPathRelationClients<Payload>(leftPath: IPathClient, rightPath: IPathClient): [IRelationClient<Payload>, IRelationClient<Payload>] {
    const leftClient = new UnsafeRelationPathClient<Payload>(leftPath)
    const rightClient = new UnsafeRelationPathClient<Payload>(rightPath)
    const twoWay = new TwoWayRelationBinder<Payload>(leftClient, rightClient)
    return createTwoWayRelationAdapters<Payload>(twoWay)
}

export class FullTextPathClient implements IFullTextClient {
    constructor(private pathClient: IPathClient){}

    async getIndex(): Promise<CollectionIndex> {
        const data = await this.pathClient.read(['index.json'])
        if(data === null) {
            return {}
        }
        return await CollectionIndexUtils.fromJson(data)
    }

    private async setIndex(index: CollectionIndex): Promise<void> {
        const b = await CollectionIndexUtils.toJson(index)
        await this.pathClient.write(['index.json'], b)
    }

    async getDocumentsByKeyword(keyword: string): Promise<FullTextReference> {
        const data = await this.pathClient.read(['index.json'])
        if(data === null) {
            return {}
        }
        return await JsonUtils.fromJson(data)
    }
    
    async updateDocument(documentId: string, keywords: KeywordsWithWeights, updatedAt: Date): Promise<void> {
        throw new Error("Method not implemented.")
        // TODO
    }

    async deleteDocument(documentId: string, updatedAt: Date): Promise<void> {
        const kb = await this.pathClient.read(this.documentPath(documentId))
        const keywords: Record<string, string> = kb === null ? {} : await JsonUtils.fromJson(kb)
        const actions = Object.fromEntries(await Promise.all(Object.keys(keywords).map(async k => {
            return [k, await this.internalDeleteDocumentFromKeyword(documentId, k)] as const
        })))
        await this.batchUpdateIndex(actions, updatedAt)
        await this.pathClient.delete(this.documentPath(documentId))
    }

    async updateKeyword(keyword: string, documents: FullTextReference, updatedAt: Date): Promise<void> {
        throw new Error("Method not implemented.")
        // TODO
    }
    
    async deleteKeyword(keyword: string): Promise<void> {
        const db = await this.pathClient.read(this.keywordPath(keyword))
        const documents: Record<string, string> = db === null ? {} : await JsonUtils.fromJson(db)
        await Promise.all(Object.keys(documents).map(id => this.internalDeleteKeywordFromDocument(keyword, id)))
        const index = await this.getIndex()
        delete index[keyword]
        await this.setIndex(index)
        await this.pathClient.delete(this.keywordPath(keyword))
    }

    private keywordPath(keyword: string): string[] {
        const b64 = Buffer.from(keyword).toString("base64")
        return ['keywords', `${b64}.json`]
    }

    private documentPath(keyword: string): string[] {
        return ['documents', `${keyword}.json`]
    }

    private async batchUpdateIndex(actions: Record<string, "delete" | "update" | "not_exist">, updatedAt: Date) {
        const index = await this.getIndex()
        for(const [k, action] of Object.entries(actions)) {
            if(action === "delete") {
                delete index[k]
            }else if(action === "update") {
                index[k] = updatedAt
            }
        }
        await this.setIndex(index)
    }

    private async internalDeleteKeywordFromDocument(keyword: string, documentId: string): Promise<"delete" | "update" | "not_exist"> {
        const data = await this.pathClient.read(this.documentPath(documentId))
        if(data === null) {
            return "not_exist"
        }
        const keywords: Record<string, string> = await JsonUtils.fromJson(data)
        delete keywords[keyword]
        if(Object.keys(keywords).length === 0) {
            await this.pathClient.delete(this.documentPath(documentId))
            return "delete"
        } else {
            await this.pathClient.write(this.documentPath(documentId), await JsonUtils.toJson(keywords))
            return "update"
        }
    }

    private async internalDeleteDocumentFromKeyword(documentId: string, keyword: string): Promise<"delete" | "update" | "not_exist"> {
        const data = await this.pathClient.read(this.keywordPath(keyword))
        if(data === null) {
            return "not_exist"
        }
        const documents: Record<string, string> = await JsonUtils.fromJson(data)
        delete documents[documentId]
        if(Object.keys(documents).length === 0) {
            await this.pathClient.delete(this.keywordPath(documentId))
            return "delete"
        } else {
            await this.pathClient.write(this.keywordPath(documentId), await JsonUtils.toJson(documents))
            return "update"
        }
    }
}
