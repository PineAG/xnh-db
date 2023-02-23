import { DeepPartial } from "utility-types"

export module IOnlineClient {
    export interface FullTextQueryResult {
        id: string
        weight: number
    }

    export interface Collection<T, Query> {
        getItemById(id: string): Promise<DeepPartial<T>>
        queryItems(query: Query): Promise<string[]>
        queryFullText(keywords: string): Promise<FullTextQueryResult[]>
        putItem(id: string, value: DeepPartial<T>): Promise<void>
        deleteItem(id: string): Promise<void>
        autocompleteFullText(prefix: string, limit: number): Promise<string[]>
    }

    export interface Relation<Keys extends string, Payload> {
        getPayload(keys: Record<Keys, string>): Promise<DeepPartial<Payload>>
        putRelation(keys: Record<Keys, string>, payload: DeepPartial<Payload>): Promise<void>
        getRelationsByKey<K extends Keys>(key: K, id: string): Promise<Record<Keys, string>[]>
        deleteRelation(keys: Record<Keys, string>): Promise<void>
    }

    export interface Files {
        list(): Promise<string[]>
        read(name: string): Promise<Blob>
        available(name: string): Promise<boolean>
        write(name: string, value: Blob): Promise<void>
        delete(name: string): Promise<void>
        markDirtyFile(name: string, isDirty: boolean): Promise<void>
        clearDirtyFiles(): Promise<void>
    }

    export interface Tags {
        getTagsByCollection(collection: string): Promise<string[]>
    }
}
