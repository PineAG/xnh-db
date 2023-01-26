export type CollectionIndex<K> = {key: K, date: Date}[]

export module ISyncClient {
    export interface Collection<T> {
        getIndex(): Promise<CollectionIndex<string>>
        getItem(id: string): Promise<T>
        updateItem(id: string, value: T, updatedAt: Date): Promise<void>
        deleteItem(id: string): Promise<void>
    }
    
    export interface Relation<Keys extends string, Payload> {
        getIndex(): Promise<CollectionIndex<Record<Keys, string>>>
        getPayload(keys: Record<Keys, string>): Promise<Payload>
        putRelation(keys: Record<Keys, string>, payload: Payload): Promise<void>
        deleteRelation(keys: Record<Keys, string>): Promise<void>
    }
}
