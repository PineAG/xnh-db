import { FC } from "react";
import { DBConfig } from "@xnh-db/common";
import {StagingStore} from "@xnh-db/core"

export module EntityPropertyInjection {
    import CBase = DBConfig.ConfigBase
    import StoreEndpoints = StagingStore

    export type EntityTitles<C extends CBase> = DBConfig.FillEndpointsWithSection<C, string, string>
    
    interface EntitySectionNode {
        title: string
    }

    interface EntityEndpointNode<N extends DBConfig.Field.Types> {
        title: string
        binding: StagingStore.PropertyEndpoint<N>
    }

    export type EntityEditorInjection<C extends CBase> = DBConfig.MapEndpointsWithSection<C, {
        fullText: EntityEndpointNode<DBConfig.Field.Types.FullText>,
        fullTextList: EntityEndpointNode<DBConfig.Field.Types.FullTextList>,
        tagList: EntityEndpointNode<DBConfig.Field.Types.TagList>,
        file: EntityEndpointNode<DBConfig.Field.Types.File>,
        fileList: EntityEndpointNode<DBConfig.Field.Types.FileList>,
    }, EntitySectionNode>

    type EndpointComponentProps<Type extends DBConfig.Field.Types> = {
        title: string,
        binding: StagingStore.PropertyEndpoint<Type>
    }

    export type Options<C extends CBase> = {
        titles: EntityTitles<C>
        bindings: StagingStore.StoreEndpoints<C>
    }

    export function getEndpoints<C extends CBase>(config: C, options: Options<C>): EntityEditorInjection<C> {
        const result: any = {
            $section: {
                title: options.titles["$section"]
            }
        }
        for(const key in config) {
            const c = config[key]
            if(DBConfig.Field.isField(c)) {
                const e: EndpointComponentProps<DBConfig.Field.Types> = {
                    title: options.titles[key] as string,
                    binding: options.bindings[key] as any
                }
                result[key] = e
            } else {
                result[key] = getEndpoints(c, {
                    titles: options.titles[key] as any,
                    bindings: options.bindings[key] as any
                })
            }
        }

        return result
    }
}