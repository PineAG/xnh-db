import { FieldConfig } from "@xnh-db/protocol"
import { DbUiConfiguration, InternalGlobalLayouts } from "../../config"
import { DeepPartial } from "utility-types";
import { XBinding } from "../binding"
import Utils = DbUiConfiguration.InternalUtils.Injection
import { DbContexts } from "../context";
import { DBSearch } from "../../data";

export module InjectionProps {
    type ConfigNodeBase = FieldConfig.ConfigBase | FieldConfig.Fields.EndpointTypes

    type TreeEntityBase = FieldConfig.EntityBase | FieldConfig.Fields.EndpointValueTypes
    type PropsTreeTitle<T extends TreeEntityBase> = DbUiConfiguration.TitlesFor<FieldConfig.EntityBase> | string
    type PropsTreeNode<T extends TreeEntityBase> = T extends FieldConfig.EntityBase ? Utils.InjectedEntity<T> : Utils.ItemInjectionEndpoint

    type EndpointEditors = InternalGlobalLayouts.EndpointEditors
    type EndpointViewers = InternalGlobalLayouts.EndpointViewers

    interface RenderStaticPropTreeProps {
        components: EndpointViewers
        openItem(id: string): void
        openSearch(q: DBSearch.IQuery): void
    }

    export function useRenderStaticPropTree<T extends TreeEntityBase>(collectionName: string) {
        const globalProps = DbContexts.useProps()
        const components = globalProps.layout.global.endpoint.viewers
        const openSearch = globalProps.actions.useOpenSearch(collectionName)
        const openItem = globalProps.actions.useOpenItem(collectionName)
        const ctx: RenderStaticPropTreeProps = {
            components,
            openItem,
            openSearch
        }
        return (config: FieldConfig.ConfigFromDeclaration<T>, value: T, title: PropsTreeTitle<T>) => {
            return renderStaticPropTree(config, value, title, ctx)
        }
    }
    
    export function renderStaticPropTree<T extends TreeEntityBase>(config: FieldConfig.ConfigFromDeclaration<T>, value: T, title: PropsTreeTitle<T>, options: RenderStaticPropTreeProps): PropsTreeNode<T> {
        return renderStaticPropTreeInternal([], config, value, title, options)
    }

    function renderStaticPropTreeInternal<T extends TreeEntityBase>(path: string[], config: FieldConfig.ConfigFromDeclaration<T>, value: T, title: PropsTreeTitle<T>, ctx: RenderStaticPropTreeProps) {
        if(FieldConfig.Fields.isEndpointType(config)) {
            if(typeof title !== "string") {
                throw new Error("Title is not string.")
            }
            if(value !== undefined && !FieldConfig.isValidEndpointValue(config, value)) {
                console.log("Invalid type")
            }
            return {
                $title: title,
                $element: renderStaticEndpoint(path, config, value as FieldConfig.Fields.EndpointValueTypes, ctx)
            } as PropsTreeNode<T>
        } else {
            const results: Record<string, string | PropsTreeNode<any>> = {
                $title: title["$title"]
            }
            for(const key in config) {
                const nextValue = value === undefined ? undefined : value[key as string]
                const nextConfig = config[key] as ConfigNodeBase
                const nextTitle = title[key as string]
                results[key] = renderStaticPropTreeInternal([...path, key], nextConfig, nextValue, nextTitle, ctx)
            }
            return results as PropsTreeNode<T>
        }
    }

    function renderStaticEndpoint<
        N extends FieldConfig.Fields.EndpointNames,
        T extends FieldConfig.Fields.ValueType<N>,
        C extends FieldConfig.Fields.FieldTypes[N],
    >(path: string[], config: C, value: T | undefined, ctx: RenderStaticPropTreeProps): React.ReactNode {
        const Comp: React.FC<InternalGlobalLayouts.EndpointViewerProps<N>> = ctx.components[config.type]
        return <Comp 
            value={value} 
            config={config}
            propertyPath={path}
            openItem={ctx.openItem}
            openSearch={ctx.openSearch}
        />
    }

    interface RenderDynamicPropTreeProps {
        components: EndpointEditors
        openItem(id: string): void
        openSearch(q: DBSearch.IQuery): void
    }

    export function useRenderDynamicPropTree<T extends TreeEntityBase>(collectionName: string) {
        const globalProps = DbContexts.useProps()
        const components = globalProps.layout.global.endpoint.editors
        const openSearch = globalProps.actions.useOpenSearch(collectionName)
        const openItem = globalProps.actions.useOpenItem(collectionName)
        const ctx: RenderDynamicPropTreeProps = {
            components,
            openItem,
            openSearch
        }
        return (config: FieldConfig.ConfigFromDeclaration<T>, binding: XBinding.Binding<DeepPartial<T>>, parentValue: DeepPartial<T>, title: PropsTreeTitle<T>) => {
            return renderDynamicPropTree(config, binding, parentValue, title, ctx)
        }
    }
    
    export function renderDynamicPropTree<T extends TreeEntityBase>(config: FieldConfig.ConfigFromDeclaration<T>, binding: XBinding.Binding<DeepPartial<T>>, parentValue: DeepPartial<T>, title: PropsTreeTitle<T>, options: RenderDynamicPropTreeProps): PropsTreeNode<T> {
        return renderDynamicPropTreeInternal([], config, binding, parentValue, title, options)
    }

    function renderDynamicPropTreeInternal<T extends TreeEntityBase>(path: string[], config: FieldConfig.ConfigFromDeclaration<T>, binding: XBinding.Binding<DeepPartial<T>>, parentValue: DeepPartial<T>, title: PropsTreeTitle<T>, ctx: RenderDynamicPropTreeProps): PropsTreeNode<T> {
        if(FieldConfig.Fields.isEndpointType(config)) {
            if(typeof title !== "string") {
                throw new Error("Title is not string.")
            }
            if(binding.value !== undefined && !FieldConfig.isValidEndpointValue(config, binding.value)) {
                throw new Error("Invalid type")
            }
            return {
                $title: title,
                $element: renderDynamicEndpoint(path, config, binding as XBinding.Binding<FieldConfig.Fields.EndpointValueTypes>, parentValue as FieldConfig.Fields.EndpointValueTypes, ctx)
            } as PropsTreeNode<T>
        } else {
            const results: Record<string, string | PropsTreeNode<any>> = {
                $title: title["$title"]
            }
            for(const key in config) {
                const nextBinding = XBinding.partialPropertyOf<T>(binding).join(key as any) as XBinding.Binding<any>
                const nextConfig = config[key] as FieldConfig.ConfigFromDeclaration<any>
                const nextParent = parentValue === undefined ? undefined : parentValue[key as any]
                const nextTitle = title[key as string]
                results[key] = renderDynamicPropTreeInternal([...path, key], nextConfig, nextBinding, nextParent, nextTitle, ctx)
            }
            return results as PropsTreeNode<T>
        }
    }

    function renderDynamicEndpoint<    
        N extends FieldConfig.Fields.EndpointNames,
        T extends FieldConfig.Fields.ValueType<N>,
        C extends FieldConfig.Fields.FieldTypes[N],
    >(
        path: string[],
        config: C, 
        binding: XBinding.Binding<T | undefined>, 
        parentValue: T | undefined,
        ctx: RenderDynamicPropTreeProps
    ): React.ReactNode {
        const Comp: React.FC<InternalGlobalLayouts.EndpointEditorProps<N>> = ctx.components[config.type]
        return <Comp
            binding={binding} 
            config={config} 
            parentValue={parentValue}
            propertyPath={path}
            openItem={ctx.openItem}
            openSearch={ctx.openSearch}
        />
    }
}