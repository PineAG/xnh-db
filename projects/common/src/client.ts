import { DBConfig } from "./config"
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

            getFullTextWeightOfEntity(type: string, id: string): Promise<number | null>
            getFullTextTotalWeightInCollection(type: string, term: string): Promise<number | null>
            getFullTextTotalWeightGlobal(term: string): Promise<number | null>

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
        export type EntityLinkPair = Query.EntityLinkPair
        export type EntityLink = Query.EntityLink

        export interface IReader {
            readEntityIndices(): Promise<EntityIndex[]>
            readEntity(type: string, id: string): Promise<{} | null>
            readFileIndices(): Promise<FileIndex[]>
            readFile(name: string): Promise<FileContent | null>
            readLinks(): Promise<EntityLink[]>
        }

        export interface IWriter {
            writeEntity(type: string, id: string, version: number, entity: {}): Promise<void>
            deleteEntity(type: string, id: string, version: number): Promise<void>

            writeFile(name: string, version: number, content: FileContent): Promise<void>
            deleteFile(name: string, version: number, content: FileContent): Promise<void>

            addLink(link: EntityLinkPair, version: number): Promise<void>
            deleteLink(link: EntityLinkPair, version: number): Promise<void>
        }

        export type QueryAdaptorConfigCollection = Record<string, DBConfig.ConfigBase>

        export class QueryAdaptor implements IReader, IWriter {
            constructor(private backend: Query.IClient, private configs: QueryAdaptorConfigCollection) {}
            

            private config(name: string): DBConfig.ConfigBase {
                const c = this.configs[name]
                if(!c) {
                    throw new Error(`Config not found: ${name}`)
                }
                return c
            }
        }
    }

    export module Utils {
        export function NewId(): string {
            return crypto.randomUUID()
        }

        export function NewVersion(): number {
            return new Date().getTime()
        }

        export function extractPutEntityOptions<C extends DBConfig.ConfigBase>(config: C, entity: DBConfig.PartialEntity<C>): Query.PutEntityOptions {
            return {
                content: entity,
                properties: DBConfig.Convert.extractProperties(config, entity),
                fullTextTerms: DBConfig.Convert.extractFullTextTerms(config, entity),
                files: DBConfig.Convert.extractFileNames(config, entity)
            }
        }
    }
}
