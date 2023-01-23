export type CollectionIndex = Record<string, Date>

export interface ICollectionClient<T> {
    getIndex(): Promise<CollectionIndex>
    getItem(id: string): Promise<T>
    updateItem(id: string, value: T, updatedAt: Date): Promise<void>
    deleteItem(id: string): Promise<void>
}

export interface IRelationClient {
    getIndex(): Promise<CollectionIndex>
    getTargetsById(id: string): Promise<string[]>
    linkToTarget(id: string, targetId: string, updateAt: Date): Promise<void>
    unlinkTarget(id: string, targetId: string, updateAt: Date): Promise<void>
    unlinkAllTargetsById(id: string): Promise<void>
}

