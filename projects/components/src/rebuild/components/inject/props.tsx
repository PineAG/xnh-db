import { FieldConfig } from "@xnh-db/protocol"
import { DbUiConfiguration, InternalGlobalLayouts } from "../../config"
import { DeepPartial } from "utility-types";
import { XBinding } from "../binding"
import Utils = DbUiConfiguration.InternalUtils.Injection

export module InjectionProps {
    type ConfigNodeBase = FieldConfig.ConfigBase | FieldConfig.Fields.EndpointTypes

    type TreeEntityBase = FieldConfig.EntityBase | FieldConfig.Fields.EndpointValueTypes
    type PropsTreeTitle<T extends TreeEntityBase> = DbUiConfiguration.TitlesFor<FieldConfig.EntityBase> | string
    type PropsTreeNode<T extends TreeEntityBase> = T extends FieldConfig.EntityBase ? Utils.InjectedEntity<T> : Utils.ItemInjectionEndpoint

    type EndpointEditors = InternalGlobalLayouts.EndpointEditors
    type EndpointViewers = InternalGlobalLayouts.EndpointViewers
    
    export function renderStaticPropTree<T extends TreeEntityBase>(comp: EndpointViewers, config: FieldConfig.ConfigFromDeclaration<T>, value: T, title: PropsTreeTitle<T>): PropsTreeNode<T> {
        if(FieldConfig.Fields.isEndpointType(config)) {
            if(typeof title !== "string") {
                throw new Error("Title is not string.")
            }
            if(value !== undefined && !FieldConfig.isValidEndpointValue(config, value)) {
                console.log("Invalid type")
            }
            return {
                $title: title,
                $element: renderStaticEndpoint(comp, config, value as FieldConfig.Fields.EndpointValueTypes)
            } as PropsTreeNode<T>
        } else {
            const results: Record<string, string | PropsTreeNode<any>> = {
                $title: title["$title"]
            }
            for(const key in config) {
                const nextValue = value === undefined ? undefined : value[key as string]
                const nextConfig = config[key] as ConfigNodeBase
                const nextTitle = title[key as string]
                results[key] = renderStaticPropTree(comp, nextConfig, nextValue, nextTitle)
            }
            return results as PropsTreeNode<T>
        }
    } 

    function renderStaticEndpoint<
        N extends FieldConfig.Fields.EndpointNames,
        T extends FieldConfig.Fields.ValueType<N>,
        C extends FieldConfig.Fields.FieldTypes[N],
    >(comp: EndpointViewers, config: C, value: T | undefined): React.ReactNode {
        const Comp: React.FC<InternalGlobalLayouts.EndpointViewerProps<N>> = comp[config.type]
        return <Comp value={value} config={config}/>
    }
    
    export function renderDynamicPropTree<T extends TreeEntityBase>(comp: EndpointEditors, config: FieldConfig.ConfigFromDeclaration<T>, binding: XBinding.Binding<DeepPartial<T>>, parentValue: DeepPartial<T>, title: PropsTreeTitle<T>): PropsTreeNode<T> {
        if(FieldConfig.Fields.isEndpointType(config)) {
            if(typeof title !== "string") {
                throw new Error("Title is not string.")
            }
            if(binding.value !== undefined && !FieldConfig.isValidEndpointValue(config, binding.value)) {
                throw new Error("Invalid type")
            }
            return {
                $title: title,
                $element: renderDynamicEndpoint(comp, config, binding as XBinding.Binding<FieldConfig.Fields.EndpointValueTypes>, parentValue as FieldConfig.Fields.EndpointValueTypes)
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
                results[key] = renderDynamicPropTree(comp, nextConfig, nextBinding, nextParent, nextTitle)
            }
            return results as PropsTreeNode<T>
        }
    }

    function renderDynamicEndpoint<    
        N extends FieldConfig.Fields.EndpointNames,
        T extends FieldConfig.Fields.ValueType<N>,
        C extends FieldConfig.Fields.FieldTypes[N],
    >(
        comp: EndpointEditors,
        config: C, 
        binding: XBinding.Binding<T | undefined>, 
        parentValue: T | undefined
    ): React.ReactNode {
        const Comp: React.FC<InternalGlobalLayouts.EndpointEditorProps<N>> = comp[config.type]
        return <Comp binding={binding} config={config} parentValue={parentValue}/>
    }
}