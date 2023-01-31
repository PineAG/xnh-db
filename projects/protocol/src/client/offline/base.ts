import {DeepPartial} from "utility-types"

export module IOfflineClient {
    export type CollectionIndex<K> = {key: K, date: Date}[]

    export interface LatestStatus {
        updatedAt: Date
    }

    export interface Collection<T> {
        getIndex(): Promise<CollectionIndex<string>>
        getStatus(): Promise<LatestStatus>
        setStatus(status: LatestStatus): Promise<void>
        flushIndex(index: CollectionIndex<string>): Promise<void>
        getItem(id: string): Promise<DeepPartial<T>>
        updateItem(id: string, value: DeepPartial<T>): Promise<void>
        deleteItem(id: string): Promise<void>
    }
    
    export interface Relation<Keys extends string, Payload> {
        getIndex(): Promise<CollectionIndex<Record<Keys, string>>>
        getStatus(): Promise<LatestStatus>
        setStatus(status: LatestStatus): Promise<void>
        flushIndex(index: CollectionIndex<Record<Keys, string>>): Promise<void>
        getPayload(keys: Record<Keys, string>): Promise<Payload>
        updateRelation(keys: Record<Keys, string>, payload: Payload): Promise<void>
        deleteRelation(keys: Record<Keys, string>): Promise<void>
    }

    export function stringifyRelationKey(keys: Record<string, string>): string {
        const names = Array.from(Object.keys(keys))
        return names.map(n => keys[n]).join(":")
    }

    export interface Files {
        getStatus(): Promise<LatestStatus>
        setStatus(status: LatestStatus): Promise<void>
        
        getIndex(): Promise<CollectionIndex<string>>
        flushIndex(index: CollectionIndex<string>): Promise<void>
    
        read(name: string): Promise<Blob>
        write(name: string, value: Blob): Promise<void>
        delete(name: string): Promise<void>
    }
}
