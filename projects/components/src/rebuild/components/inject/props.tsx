import { FieldConfig } from "@xnh-db/protocol"
import { DbUiConfiguration } from "../../config"
import { DeepPartial } from "utility-types";
import { XBinding } from "../binding"
import { EndpointEditors } from "./edit"
import { EndpointViewers } from "./view"
import Utils = DbUiConfiguration.InternalUtils.Injection

export module InjectionProps {
    type ConfigNodeBase = FieldConfig.ConfigBase | FieldConfig.Fields.EndpointTypes

    type TreeEntityBase = FieldConfig.EntityBase | FieldConfig.Fields.EndpointTypes
    type PropsTreeTitle<T extends TreeEntityBase> = T extends FieldConfig.EntityBase ? DbUiConfiguration.TitlesFor<T>: string
    type PropsTreeNode<T extends TreeEntityBase> = T extends FieldConfig.EntityBase ? Utils.InjectedEntity<T> : Utils.ItemInjectionEndpoint
    
    export function renderStaticPropTree<T extends TreeEntityBase>(config: FieldConfig.ConfigFromDeclaration<T>, value: T, title: PropsTreeTitle<T>): PropsTreeNode<T> {
        if(FieldConfig.Fields.isEndpointType(config)) {
            if(typeof title !== "string") {
                throw new Error("Title is not string.")
            }
            if(value !== undefined && !FieldConfig.isValidEndpointValue(config, value)) {
                console.log("Invalid type")
            }
            return {
                $title: title,
                $element: renderStaticEndpoint(config, value)
            } as PropsTreeNode<T>
        } else {
            const results: Record<string, string | PropsTreeNode<any>> = {
                $title: title["$title"]
            }
            for(const key in config) {
                const nextValue = value === undefined ? undefined : value[key as string]
                const nextConfig = config[key] as ConfigNodeBase
                const nextTitle = title[key as string]
                results[key] = renderStaticPropTree(nextConfig, nextValue, nextTitle)
            }
            return results as PropsTreeNode<T>
        }
    } 

    function renderStaticEndpoint<T>(config: FieldConfig.Fields.EndpointTypes, value: any): React.ReactNode {
        return EndpointViewers.renderEndpoint(value, config)
    }
    
    export function renderDynamicPropTree<T extends TreeEntityBase>(config: FieldConfig.ConfigFromDeclaration<T>, binding: XBinding.Binding<DeepPartial<T>>, parentValue: DeepPartial<T>, title: PropsTreeTitle<T>): PropsTreeNode<T> {
        if(FieldConfig.Fields.isEndpointType(config)) {
            if(typeof title !== "string") {
                throw new Error("Title is not string.")
            }
            if(binding.value !== undefined && !FieldConfig.isValidEndpointValue(config, binding.value)) {
                throw new Error("Invalid type")
            }
            return {
                $title: title,
                $element: renderDynamicEndpoint(config, binding as XBinding.Binding<FieldConfig.Fields.EndpointValueTypes>, parentValue as FieldConfig.Fields.EndpointValueTypes)
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
                results[key] = renderDynamicPropTree(nextConfig, nextBinding, nextParent, nextTitle)
            }
            return results as PropsTreeNode<T>
        }
    }

    function renderDynamicEndpoint(config: FieldConfig.Fields.EndpointTypes, binding: XBinding.Binding<FieldConfig.Fields.EndpointValueTypes | undefined>, parentValue: FieldConfig.Fields.EndpointValueTypes | undefined): React.ReactNode {
        return EndpointEditors.renderEndpoint(binding, parentValue, config)
    }
}