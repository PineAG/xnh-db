import {DBClients, DBSearch} from "@xnh-db/common"

export module IndexedDBAdaptors {
    export module FullSync {
        export class Reader implements DBClients.FullSync.IReader {
            readIndices(): Promise<DBClients.EntityIndex> {
                throw new Error("Method not implemented.");
            }
            readEntity(type: string, id: string): Promise<{} | null> {
                throw new Error("Method not implemented.");
            }
            readFile(name: string): Promise<Uint8Array | null> {
                throw new Error("Method not implemented.");
            }

        }

        export class Writer implements DBClients.FullSync.IWriter {
            writeIndices(indices: DBClients.EntityIndex[]): Promise<void> {
                throw new Error("Method not implemented.");
            }
            writeEntity(type: string, id: string, version: number, entity: {}): Promise<void> {
                throw new Error("Method not implemented.");
            }
            deleteEntity(type: string, id: string, version: number): Promise<void> {
                throw new Error("Method not implemented.");
            }
            writeFile(name: string, content: Uint8Array): Promise<void> {
                throw new Error("Method not implemented.");
            }
            deleteFile(name: string, content: Uint8Array): Promise<void> {
                throw new Error("Method not implemented.");
            }

        }
    }

    export module Query {
        export class Client implements DBClients.Query.IClient {
            listEntities(): Promise<DBClients.EntityIndex[]> {
                throw new Error("Method not implemented.");
            }
            getEntityIndex(type: string, id: string): Promise<DBClients.EntityIndex | null> {
                throw new Error("Method not implemented.");
            }
            getEntityContent(type: string, id: string): Promise<{} | null> {
                throw new Error("Method not implemented.");
            }
            putEntity(type: string, id: string, version: number, content: {}, properties: DBClients.Query.EntityProperties, fullTextTerms: DBClients.Query.EntityTokens): Promise<void> {
                throw new Error("Method not implemented.");
            }
            deleteEntity(type: string, id: string, properties: DBClients.Query.EntityProperties, fullTextTerms: DBClients.Query.EntityTokens): Promise<void> {
                throw new Error("Method not implemented.");
            }
            queryByTag(property: string, value: string): Promise<DBSearch.SearchResult[]> {
                throw new Error("Method not implemented.");
            }
            queryByTagInCollection(type: string, property: string, value: string): Promise<DBSearch.SearchResult[]> {
                throw new Error("Method not implemented.");
            }
            queryByFullText(terms: DBClients.Query.EntityTokens): Promise<DBSearch.SearchResult[]> {
                throw new Error("Method not implemented.");
            }
            queryByFullTextInCollection(type: string, terms: DBClients.Query.EntityTokens): Promise<DBSearch.SearchResult[]> {
                throw new Error("Method not implemented.");
            }
            readFile(name: string): Promise<Uint8Array> {
                throw new Error("Method not implemented.");
            }
            writeFile(name: string, content: Uint8Array): Promise<void> {
                throw new Error("Method not implemented.");
            }
            deleteFile(name: string): Promise<void> {
                throw new Error("Method not implemented.");
            }
            linkFile(name: string, type: string, id: string): Promise<number> {
                throw new Error("Method not implemented.");
            }
            unlinkFile(name: string, type: string, id: string): Promise<number> {
                throw new Error("Method not implemented.");
            }

        }
    }
}