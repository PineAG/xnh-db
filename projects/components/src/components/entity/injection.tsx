import { FC } from "react";
import { DBConfig } from "@xnh-db/common";
import {StagingStore} from "@xnh-db/core"

export module EntityPropertyInjection {
    import CBase = DBConfig.ConfigBase
    import StoreEndpoints = StagingStore

    export type EntityTitles<C extends CBase> = DBConfig.FillEndpointsWithSection<CBase, string, string>
    
    interface EntitySectionNode {
        title: string
    }

    interface EntityEndpointNode {
        title: string
        Component: FC<{}>
    }

    export type EntityEditorInjection<C extends CBase> = DBConfig.FillEndpointsWithSection<C, EntityEndpointNode, EntitySectionNode>

    export type InjectionComponents<C extends CBase> = DBConfig.MapEndpoints<C, {
        file: EndpointComponent<DBConfig.Field.Types.File>,
        fileList: EndpointComponent<DBConfig.Field.Types.FileList>,
        tagList: EndpointComponent<DBConfig.Field.Types.TagList>,
        fullText: EndpointComponent<DBConfig.Field.Types.FullText>,
        fullTextList: EndpointComponent<DBConfig.Field.Types.FullTextList>,
    }>

    type EndpointComponentProps<Type extends DBConfig.Field.Types> = {
        title: string,
        binding: StagingStore.PropertyEndpoint<Type>
    }
    type EndpointComponent<Type extends DBConfig.Field.Types> = FC<EndpointComponentProps<Type>>

    export type Options<C extends CBase> = {
        titles: EntityTitles<C>
        components: InjectionComponents<C>
    }
}