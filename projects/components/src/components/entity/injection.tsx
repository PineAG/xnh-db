import { DBConfig } from "@xnh-db/common";
import {StagingStore} from "@xnh-db/core"

export module EntityPropertyInjection {
    import CBase = DBConfig.ConfigBase

    export type EntityTitles<C extends CBase> = DBConfig.FillEndpointsWithSection<C, string, string>
    
    interface EntitySectionNode {
        title: string
    }

    interface EntityEndpointNode<N extends DBConfig.Field.Types> {
        title: string
        config: DBConfig.Field.Field<N>
        path: string
        binding: StagingStore.PropertyEndpoint<N>
    }

    interface EntityReadonlyEndpointNode<N extends DBConfig.Field.Types> {
        title: string
        config: DBConfig.Field.Field<N>
        path: string
        value: DBConfig.Field.Payloads[N] | null
    }

    export type EntityEditorInjection<C extends CBase> = DBConfig.MapEndpointsWithSection<C, {
        fullText: EntityEndpointNode<DBConfig.Field.Types.FullText>,
        fullTextList: EntityEndpointNode<DBConfig.Field.Types.FullTextList>,
        tagList: EntityEndpointNode<DBConfig.Field.Types.TagList>,
        file: EntityEndpointNode<DBConfig.Field.Types.File>,
        fileList: EntityEndpointNode<DBConfig.Field.Types.FileList>,
    }, EntitySectionNode>

    export type EntityReadonlyEndpoints<C extends CBase> = DBConfig.MapEndpointsWithSection<C, {
        fullText: EntityReadonlyEndpointNode<DBConfig.Field.Types.FullText>,
        fullTextList: EntityReadonlyEndpointNode<DBConfig.Field.Types.FullTextList>,
        tagList: EntityReadonlyEndpointNode<DBConfig.Field.Types.TagList>,
        file: EntityReadonlyEndpointNode<DBConfig.Field.Types.File>,
        fileList: EntityReadonlyEndpointNode<DBConfig.Field.Types.FileList>,
    }, EntitySectionNode>

    export type Options<C extends CBase> = {
        titles: EntityTitles<C>
        bindings: StagingStore.StoreEndpoints<C>
    }

    export function getEndpoints<C extends CBase>(config: C, options: Options<C>, pathPrefix: string = ""): EntityEditorInjection<C> {
        const result: any = {
            $section: {
                title: options.titles["$section"]
            }
        }
        for(const key in config) {
            const c = config[key]
            const p = `${pathPrefix}/${key}`
            if(DBConfig.Field.isField(c)) {
                const e: EntityEndpointNode<DBConfig.Field.Types> = {
                    title: options.titles[key] as string,
                    config: c,
                    path: p,
                    binding: options.bindings[key] as any
                }
                result[key] = e
            } else {
                result[key] = getEndpoints(c, {
                    titles: options.titles[key] as any,
                    bindings: options.bindings[key] as any
                }, p)
            }
        }

        return result
    }

    export type ReadonlyOptions<C extends CBase> = {
        titles: EntityTitles<C>
        entity: DBConfig.PartialEntity<C>
    }

    export function getReadonlyEndpoints<C extends CBase>(config: C, options: ReadonlyOptions<C>, pathPrefix: string = ""): EntityReadonlyEndpoints<C> {
        const result: any = {
            $section: {
                title: options.titles["$section"]
            }
        }
        for(const key in config) {
            const c = config[key]
            const p = `${pathPrefix}/${key}`
            if(DBConfig.Field.isField(c)) {
                const e: EntityReadonlyEndpointNode<DBConfig.Field.Types> = {
                    title: options.titles[key] as string,
                    config: c,
                    path: p,
                    value: options.entity[key] as any ?? null
                }
                result[key] = e
            } else {
                result[key] = getReadonlyEndpoints(c, {
                    titles: options.titles[key] as any,
                    entity: options.entity[key] as any ?? {}
                }, p)
            }
        }

        return result
    }
}