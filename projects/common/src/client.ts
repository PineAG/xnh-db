import { DBSearch } from "./search"
import { DBTokenize } from "./tokenize"

export module DBClients {
    export type FileContent = Uint8Array

    export enum EntityState {
        Deleted = 0,
        Active = 1
    }

    export interface EntityIndex {
        id: string
        type: string
        status: EntityState
        version: number
    }

    export interface FileIndex {
        name: string
        version: number
        status: EntityState
    }

    export module Query {
        export type EntityProperties = {
            propertyCollection: string,
            values: Record<string, string[]>
        }
        export type EntityTokens = DBTokenize.IToken[]

        export interface IClient {
            listEntities(): Promise<EntityIndex[]>
            getEntityIndex(type: string, id: string): Promise<EntityIndex | null>

            getEntityContent(type: string, id: string): Promise<{} | null>
            putEntity(type: string, id: string, version: number, content: {}, properties: EntityProperties, fullTextTerms: EntityTokens): Promise<void>
            deleteEntity(type: string, id: string, properties: EntityProperties, fullTextTerms: EntityTokens): Promise<void>

            queryByTag(property: string, value: string): Promise<DBSearch.SearchResult[]>
            queryByTagInCollection(type: string, property: string, value: string): Promise<DBSearch.SearchResult[]>
            queryByFullText(terms: EntityTokens): Promise<DBSearch.SearchResult[]>
            queryByFullTextInCollection(type: string, terms: EntityTokens): Promise<DBSearch.SearchResult[]>

            listTagsInCollection(property: string): Promise<string[]>
            listTagsGlobal(property: string): Promise<string[]>

            listFiles(): Promise<FileIndex[]>
            readFile(name: string): Promise<FileContent>
            writeFile(name: string, content: FileContent): Promise<void>
            deleteFile(name: string): Promise<void>
            linkFile(name: string, type: string, id: string): Promise<number>
            unlinkFile(name: string, type: string, id: string): Promise<number>
        }
    }

    export module FullSync {
        export interface IReader {
            readIndices(): Promise<EntityIndex>
            readEntity(type: string, id: string): Promise<{} | null>
            readFile(name: string): Promise<FileContent | null>
        }

        export interface IWriter {
            writeIndices(indices: EntityIndex[]): Promise<void>
            
            writeEntity(type: string, id: string, version: number, entity: {}): Promise<void>
            deleteEntity(type: string, id: string, version: number): Promise<void>

            writeFile(name: string, content: FileContent): Promise<void>
            deleteFile(name: string, content: FileContent): Promise<void>
        }
    }

    export module Utils {
        export function NewId(): string {
            return crypto.randomUUID()
        }

        export function NewVersion(): number {
            return new Date().getTime()
        }
    }
}
