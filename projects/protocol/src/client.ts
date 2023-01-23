export type CollectionIndex = Record<string, Date>

export interface ICollectionReadonlyClient<T> {
    getIndex(): Promise<CollectionIndex>
    getItem(id: string): Promise<T>
}

export interface ICollectionReadWriteClient<T> extends ICollectionReadonlyClient<T> {
    updateItem(id: string, value: T, updatedAt: Date): Promise<void>
    deleteItem(id: string, updatedAt: Date): Promise<void>
}

export interface IRelationReadonlyClient {
    getIndex(): Promise<CollectionIndex>
    getTargetsById(id: string): Promise<string[]>
}

export interface IRelationReadWriteClient extends IRelationReadonlyClient {
    linkToTarget(id: string, targetId: string, updateAt: Date): Promise<void>
    unlinkTarget(id: string, targetId: string, updateAt: Date): Promise<void>
    unlinkAllTargetsById(id: string, updateAt: Date): Promise<void>
}
