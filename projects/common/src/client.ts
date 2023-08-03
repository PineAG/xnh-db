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
            version: number
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
            getFileMeta(name: string): Promise<FileIndex | null>
            readFile(name: string): Promise<FileContent | null>
            writeFile(name: string, version: number, content: FileContent): Promise<void>
            writeFileContent(name: string, content: FileContent): Promise<void>
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
            readEntity(type: string, id: string): Promise<{}>
            readFile(name: string): Promise<FileContent>
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
                putEntity: {type: string, id: string, readEntity: () => Promise<{}>, version: number},
                deleteEntity: {type: string, id: string, version: number},
                putLink: EntityLinkPair & {version: number},
                deleteLink: EntityLinkPair & {version: number},
                putFile: {fileName: string, readContent: () => Promise<FileContent>, version: number},
                deleteFile: {fileName: string, version: number},
            }

            type ActionOption<A extends ActionTypes, R extends ResourceTypes> = ActionOptions[`${A}${Capitalize<R>}`]
    
            export interface Action<A extends ActionTypes, R extends ResourceTypes> {
                action: A
                resource: R
                options: ActionOption<A, R>
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

            type OptionsCollection = {
                [K in keyof ActionOptions]: ActionOptions[K][]
            }

            export type ActionBase = Actions.Action<ActionTypes, ResourceTypes>

            export interface ExtractSyncActionsOptions {
                createFileReader(name: string): () => Promise<FileContent>
                createEntityReader(type: string, id: string): () => Promise<{}>

            }

            export async function extractActions(srcReader: IReader, dstReader: IReader): Promise<ActionCollection> {
                const [srcState, dstState] = await Promise.all([
                    srcReader.readStoreState(),
                    dstReader.readStoreState()
                ])
                const actions = extractSyncActionsFromStates(srcState, dstState, {
                    createEntityReader: (type, id) => () => srcReader.readEntity(type, id),
                    createFileReader: (name) => () => srcReader.readFile(name)
                })
                return actions
            }

            export async function performActions(writer: IWriter, actions: ActionCollection) {
                for await(const action of writer.performActions(actions));
            }

            export function extractSyncActionsFromStates(srcState: StoreState, dstState: StoreState, options: ExtractSyncActionsOptions): ActionCollection {
                const resultOptions: OptionsCollection = {
                    putEntity: [],
                    deleteEntity: [],
                    putLink: [],
                    deleteLink: [],
                    putFile: [],
                    deleteFile: []
                }

                for(const link of diffStates(
                    srcState.links, dstState.links, 
                    it => `${it.left.type}_${it.left.id}_${it.left.referenceName}:${it.right.type}_${it.right.id}_${it.right.referenceName}`)
                ) {
                    if(link.status === EntityState.Active) {
                        resultOptions.putLink.push({
                            left: link.left,
                            right: link.right,
                            version: link.version
                        })
                    } else {
                        resultOptions.deleteLink.push({
                            left: link.left,
                            right: link.right,
                            version: link.version
                        })
                    }
                }

                for(const entity of diffStates(
                    srcState.entities, dstState.entities,
                    it => `${it.type}_${it.id}`
                )) {
                    if(entity.status === EntityState.Active) {
                        resultOptions.putEntity.push({
                            type: entity.type,
                            id: entity.id,
                            version: entity.version,
                            readEntity: options.createEntityReader(entity.type, entity.id)
                        })
                    } else {
                        resultOptions.deleteEntity.push({
                            id: entity.id,
                            type: entity.type,
                            version: entity.version
                        })
                    }
                }

                for(const file of diffStates(srcState.files, dstState.files, it => it.name)) {
                    if(file.status === EntityState.Active) {
                        resultOptions.putFile.push({
                            fileName: file.name,
                            version: file.version,
                            readContent: options.createFileReader(file.name)
                        })
                    } else {
                        resultOptions.deleteFile.push({
                            fileName: file.name,
                            version: file.version
                        })
                    }
                }

                const actions: ActionCollection = {
                    putEntity: composeActions(ActionTypes.Put, ResourceTypes.Entity, resultOptions.putEntity),
                    deleteEntity: composeActions(ActionTypes.Delete, ResourceTypes.Entity, resultOptions.deleteEntity),
                    putLink: composeActions(ActionTypes.Put, ResourceTypes.Link, resultOptions.putLink),
                    deleteLink: composeActions(ActionTypes.Delete, ResourceTypes.Link, resultOptions.deleteLink),
                    putFile: composeActions(ActionTypes.Put, ResourceTypes.File, resultOptions.putFile),
                    deleteFile: composeActions(ActionTypes.Delete, ResourceTypes.File, resultOptions.deleteFile),
                }

                return actions
            }

            function composeActions<A extends ActionTypes, R extends ResourceTypes>(actionType: A, resourceType: R, options: ActionOption<A, R>[]): Action<A, R>[] {
                return options.map(op => ({
                    action: actionType,
                    resource: resourceType,
                    options: op
                }))
            }

            function diffStates<T extends {version: number}>(src: T[], dst: T[], toString: (t: T) => string): T[] {
                const srcEntities = arrayToMap(src, toString)
                const dstEntities = arrayToMap(dst, toString)
                const results: T[] = []
                for(const s in srcEntities) {
                    const srcVersion = srcEntities[s].version
                    const dstVersion = dstEntities[s]?.version ?? -1
                    if(srcVersion > dstVersion) {
                        results.push(srcEntities[s])
                    }
                }
                return results
            }

            function arrayToMap<T>(items: T[], toString: (t: T) => string): Record<string, T> {
                return Object.fromEntries(items.map(it => [toString(it), it]))
            }
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

            async readEntity(type: string, id: string): Promise<{}> {
                const result = await this.queryClient.getEntityContent(type, id)
                if(result == null) {
                    throw new Error(`Entity not found: ${type} ${id}`)
                }
                return result
            }

            async readFile(name: string): Promise<FileContent> {
                const result = await this.queryClient.readFile(name)
                if(result == null) {
                    throw new Error(`File not found: ${name}`)
                }
                return result
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
                    const {type, id, version, readEntity} = a.options
                    const config = this.configs[type]
                    if(config == null) {
                        throw new Error(`Invalid type: ${type}`)
                    }
                    const entity = await readEntity()
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
