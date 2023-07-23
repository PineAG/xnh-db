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
        export type EntityPropertyItem = {propertyCollection: string, values: string[]}
        export type EntityProperties = Record<string, EntityPropertyItem>

        export interface PutEntityOptions {
            content: {}
            properties: EntityProperties
            fullTextTerms: DBTokenize.IToken[]
            files: string[]
        }

        export interface EntityLinkReference {
            referenceName: string
            type: string
            id: string
        }

        export interface EntityLinkResult {
            self: EntityLinkReference
            opposite: EntityLinkReference
        }

        export interface EntityLinkPair {
            left: EntityLinkReference
            right: EntityLinkReference
        }
        
        export interface EntityLink extends EntityLinkPair {
            version: number
            status: EntityState
        }

        export interface IClient {
            listEntities(): Promise<EntityIndex[]>
            getEntityIndex(type: string, id: string): Promise<EntityIndex | null>

            getEntityContent(type: string, id: string): Promise<{} | null>
            putEntity(type: string, id: string, version: number, options: PutEntityOptions): Promise<void>
            deleteEntity(type: string, id: string, version: number): Promise<void>

            // properties
            queryByTag(type: string, property: string, value: string): Promise<DBSearch.SearchResult[]>
            listTags(propertyCollection: string): Promise<string[]>

            // full text
            queryByFullTextTermGlobal(term: string): Promise<DBSearch.SearchResult[]>
            queryByFullTextTermInCollection(type: string, term: string): Promise<DBSearch.SearchResult[]>

            // files
            listFiles(): Promise<FileIndex[]>
            fileExists(name: string): Promise<boolean>
            readFile(name: string): Promise<FileContent | null>
            writeFile(name: string, version: number, content: FileContent): Promise<void>
            purgeFiles(): Promise<void>

            // links
            listLinks(): Promise<EntityLink[]>
            putLink(left: EntityLinkReference, right: EntityLinkReference, version: number): Promise<void>
            getLinksOfEntity(type: string, id: string): Promise<EntityLinkResult[]>
            deleteLink(left: EntityLinkReference, right: EntityLinkReference, version: number): Promise<void>
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
