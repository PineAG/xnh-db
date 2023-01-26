export type CollectionIndex = Record<string, Date>

export interface ICollectionClient<T> {
    getIndex(): Promise<CollectionIndex>
    getItem(id: string): Promise<T>
    updateItem(id: string, value: T, updatedAt: Date): Promise<void>
    deleteItem(id: string): Promise<void>
}

export interface IRelationClient<Keys extends string, Payload> {
    keys(): Keys[]
    getIndexByKey<K extends Keys>(key: K): Promise<CollectionIndex>
    getRelationsById<K extends Keys>(key: K, id: string)
    putRelation(keys: Record<Keys, string>, payload: Payload): Promise<void>
    deleteRelation(keys: Record<Keys, string>): Promise<void>
}

export type KeywordsWithWeights = Record<string, number>
export type FullTextReference = Record<string, number>

export interface IFullTextClient {
    getIndex(): Promise<CollectionIndex>
    getDocumentsByKeyword(keyword: string): Promise<FullTextReference>

    updateDocument(documentId: string, keywords: KeywordsWithWeights, updatedAt: Date): Promise<void>
    deleteDocument(documentId: string, updatedAt: Date): Promise<void>

    updateKeyword(keyword: string, documents: FullTextReference, updatedAt: Date): Promise<void>
    deleteKeyword(keyword: string): Promise<void>
}
