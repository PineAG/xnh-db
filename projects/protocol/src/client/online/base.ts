export module IOnlineClient {
    export interface Collection<T, Query> {
        getItemById(id: string): Promise<T>
        queryItems(query: Query): Promise<T[]>
        putItem(id: string, value: T, updatedAt: Date): Promise<void>
        deleteItem(id: string): Promise<void>
    }

    export interface Relation<Keys extends string, Payload> {
        getPayload(keys: Record<Keys, string>): Promise<Payload>
        putRelation(keys: Record<Keys, string>, payload: Payload, updatedAt: Date): Promise<void>
        deleteRelation(keys: Record<Keys, string>): Promise<void>
    }
}
