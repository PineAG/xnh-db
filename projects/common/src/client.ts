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
            readFile(name: string, fallbackReader: (name: string) => Promise<Uint8Array | null>): Promise<FileContent | null>
            writeFile(name: string, version: number, content: FileContent): Promise<void>
            deleteFileContent(name: string): Promise<void>
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

        export interface StoreState {
            entities: EntityIndex[]
            files: FileIndex[]
            links: EntityLink[]
        }

        export interface IReader {
            readStoreState(): Promise<StoreState>
        }

        export interface IWriter {
            performActions(actions: Actions.ActionCollection): AsyncGenerator<Actions.ActionBase>
        }

        export module Actions {
            export enum ActionTypes {
                Put = "put",
                Delete = "delete"
            }

            export enum ResourceTypes {
                Entity = "entity",
                Link = "link",
                File = "file"
            }
    
            type ActionOptions = {
                putEntity: {type: string, id: string, entity: {}, version: number},
                deleteEntity: {type: string, id: string, version: number},
                putLink: EntityLinkPair & {version: number},
                deleteLink: EntityLinkPair & {version: number},
                putFile: {fileName: string, readContent: () => Promise<FileContent>, version: number},
                deleteFile: {fileName: string},
            }
    
            export interface Action<A extends ActionTypes, R extends ResourceTypes> {
                action: A
                resource: R
                options: ActionOptions[`${A}${Capitalize<R>}`]
            }
    
            export function isActionOfType<A extends ActionTypes, R extends ResourceTypes>(actionType: A, resourceType: R, obj: ActionBase): obj is Action<A, R> {
                return obj.action === actionType && obj.resource === resourceType
            }

            export type ActionCollection = {
                putEntity: Action<ActionTypes.Put, ResourceTypes.Entity>[]
                deleteEntity: Action<ActionTypes.Delete, ResourceTypes.Entity>[]
                putLink: Action<ActionTypes.Put, ResourceTypes.Link>[]
                deleteLink: Action<ActionTypes.Delete, ResourceTypes.Link>[]
                putFile: Action<ActionTypes.Put, ResourceTypes.File>[]
                deleteFile: Action<ActionTypes.Delete, ResourceTypes.File>[]
            }

            export type ActionBase = Actions.Action<ActionTypes, ResourceTypes>
        }

        type ConfigCollection = Record<string, DBConfig.ConfigBase>

        export class QueryClientAdaptor implements IReader, IWriter {
            constructor(private queryClient: Query.IClient, private configs: ConfigCollection) {}

            async readStoreState(): Promise<StoreState> {
                const entities = await this.queryClient.listEntities()
                const links = await this.queryClient.listLinks()
                const files = await this.queryClient.listFiles()
                return {entities, links, files}
            }

            async* performActions(actions: Actions.ActionCollection): AsyncGenerator<Actions.ActionBase> {
                for(const a of actions.deleteFile) {
                    yield a
                    await this.queryClient.deleteFileContent(a.options.fileName)
                }
                for(const a of actions.putFile) {
                    yield a
                    const {fileName, version, readContent} = a.options
                    const content = await readContent()
                    await this.queryClient.writeFile(fileName, version, content)
                }
                for(const a of actions.deleteEntity) {
                    yield a
                    const {type, id, version} = a.options
                    await this.queryClient.deleteEntity(type, id, version)
                }
                for(const a of actions.putEntity) {
                    yield a
                    const {type, id, version, entity} = a.options
                    const config = this.configs[type]
                    if(config == null) {
                        throw new Error(`Invalid type: ${type}`)
                    }
                    const fullTextTerms = DBConfig.Convert.extractFullTextTerms(config, entity)
                    const files = DBConfig.Convert.extractFileNames(config, entity)
                    const properties = DBConfig.Convert.extractProperties(config, entity)
                    await this.queryClient.putEntity(type, id, version, {
                        content: entity,
                        files,
                        properties,
                        fullTextTerms
                    })
                }
                for(const a of actions.deleteLink) {
                    yield a
                    const {left, right, version} = a.options
                    await this.queryClient.deleteLink(left, right, version)
                }
                for(const a of actions.putLink) {
                    yield a
                    const {left, right, version} = a.options
                    await this.queryClient.putLink(left, right, version)
                }
                await this.queryClient.purgeFiles()
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
