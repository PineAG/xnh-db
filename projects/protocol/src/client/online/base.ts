import { DeepPartial } from "utility-types"

export module IOnlineClient {
    export interface FullTextQueryResult {
        id: string
        weight: number
    }

    export interface Collection<T, Query> {
        getItemById(id: string): Promise<DeepPartial<T>>
        queryItems(query: Query): Promise<string[]>
        queryFullText(keywords: string[]): Promise<FullTextQueryResult[]>
        putItem(id: string, value: DeepPartial<T>): Promise<void>
        deleteItem(id: string): Promise<void>
    }

    export interface Relation<Keys extends string, Payload> {
        getPayload(keys: Record<Keys, string>): Promise<Payload>
        putRelation(keys: Record<Keys, string>, payload: Payload): Promise<void>
        getRelationsByKey<K extends Keys>(key: K, id: string): Promise<Record<Keys, string>[]>
        deleteRelation(keys: Record<Keys, string>): Promise<void>
    }
}
