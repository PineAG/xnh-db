import { FieldConfig } from "@xnh-db/protocol";
import { DeepPartial } from "utility-types";
import { XBinding } from "../binding";
import { DbUiConfiguration } from "../../config";

import CollNames = DbUiConfiguration.InternalUtils.CollNames
import RelName = DbUiConfiguration.InternalUtils.RelName
import Utils = DbUiConfiguration.InternalUtils.Injection
import GPBase = DbUiConfiguration.GlobalPropsBase
import { BackendBase } from "../../data";
import { InheritanceUtils } from "../../data/inherit";
import { useEffect, useState } from "react";
import { Loading } from "@pltk/components";
import { EndpointViewers } from "./view";
import { EndpointEditors } from "./edit";

export module LayoutInjector {

    export async function createRelationsInjection<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
        >(
            config: GP, 
            clients: BackendBase.OnlineClientSet<GP["props"]>, 
            collectionName: CollectionName,
            itemId: string
        ): Promise<Utils.RelationsDisplayInjection<GP, CollectionName>> {
        const result: Record<string, Utils.RelationInjectionEndpoint> = {}
        const collToRel = config.props.collectionsToRelations[collectionName]
        type ColRelName = Extract<keyof GP["props"]["collectionsToRelations"][CollectionName], string>
        for(const relName of Object.keys(collToRel) as ColRelName[]) {
            result[relName] = await getRelationEndpointElement(config, clients, collectionName, relName, itemId)
        }
        return result as Utils.RelationsDisplayInjection<GP, CollectionName>
    }

    async function getRelationEndpointElement<
        GP extends GPBase,
        CName extends CollNames<GP>,
        RelName extends Extract<keyof GP["props"]["collectionsToRelations"][CName], string>
        >(
        config: GP, 
        clients: BackendBase.OnlineClientSet<GP["props"]>,
        collectionName: CName,
        relationMappingName: RelName,
        itemId: string
    ): Promise<Utils.RelationInjectionEndpoint> {
        const relations = await InheritanceUtils.getInheritedRelations(config.props, clients, collectionName, relationMappingName, itemId)

        return {
            $richListElement: () => <RelationListWrapper
                config={config}
                collectionName={collectionName}
                clients={clients}
                relationMappingName={relationMappingName}
                itemId={itemId}
                relations={relations}
                type="rich"
                />,
            $simpleListElement: () => <RelationListWrapper
                config={config}
                collectionName={collectionName}
                clients={clients}
                relationMappingName={relationMappingName}
                itemId={itemId}
                relations={relations}
                type="simple"
                />
        }
    }

    type RelationListWrapperProps<
        GP extends GPBase,
        CName extends CollNames<GP>,
        RelName extends Extract<keyof GP["props"]["collectionsToRelations"][CName], string>
        > = {
            type: "rich" | "simple",
            itemId: string,
            config: GP,
            collectionName: CName,
            relationMappingName: RelName,
            relations: InheritanceUtils.RelationQueryResult[],
            clients: BackendBase.OnlineClientSet<GP["props"]>,
        }
    function RelationListWrapper<
        GP extends GPBase,
        CName extends CollNames<GP>,
        RelName extends Extract<keyof GP["props"]["collectionsToRelations"][CName], string>
        >(props: RelationListWrapperProps<GP, CName, RelName>) {

        const {config, collectionName, relationMappingName, itemId, clients} = props
        const {relation: targetRelationName, selfKey, targetKey} = config.props.collectionsToRelations[collectionName][relationMappingName]
        const targetRelationConfig = config.props.relations[targetRelationName]
        const targetCollectionName = targetRelationConfig.collections[targetKey]

        const targetCollectionClient = clients.collections[targetCollectionName]
        const targetInheritClient = clients.inheritance[targetCollectionName]
        const collectionConfig = config.props.collections[targetCollectionName].config
        const titles = config.layout.titles.entityTitles[targetCollectionName] as DbUiConfiguration.TitlesFor<FieldConfig.EntityBase>
        const Layout = config.layout.layouts[targetCollectionName].relationPreview[props.type]
        
        type CollectionType = FieldConfig.EntityFromConfig<GP["props"]["collections"][CName]["config"]>
        const [items, setItems] = useState<null | [string, CollectionType][]>(null)

        useEffect(() => {
            initialize()
        }, [props.itemId, props.collectionName])

        if(items === null) {
            return <Loading/>
        } else {
            return <>{items.map(([id, item]) => {
                const itemProps = renderStaticPropTree<FieldConfig.EntityBase>(collectionConfig, item, titles)
                return <Layout key={id} item={itemProps}/>
            })}</>
        }

        async function initialize() {
            const items = await Promise.all(props.relations.map(async rel => {
                const targetItem = targetInheritClient ?
                    await InheritanceUtils.getEntityPatchingParents(props.itemId, collectionConfig, targetCollectionClient, targetInheritClient):
                    await targetCollectionClient.getItemById(rel.targetId)
                return targetItem
            }))
            setItems(items)
        }
    }

    
    export async function createItemInjection<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
        >(
            config: GP, 
            clients: BackendBase.OnlineClientSet<GP["props"]>, 
            collectionName: CollectionName,
            itemId: string
            ): Promise<Utils.ItemDisplayInjection<GP, CollectionName>> {
                const collectionConfig = config.props.collections[collectionName].config
                const collectionClient = clients.collections[collectionName]
                const inheritClient = clients.inheritance[collectionName]
                const titles = config.layout.titles.entityTitles[collectionName] as DbUiConfiguration.TitlesFor<FieldConfig.EntityBase>
                const item = inheritClient ?
                    await InheritanceUtils.getEntityPatchingParents(itemId, collectionConfig, collectionClient, inheritClient) :
                    await collectionClient.getItemById(itemId)
                const injectProps = renderStaticPropTree<FieldConfig.EntityBase>(collectionConfig, item, titles)
                return injectProps as Utils.ItemDisplayInjection<GP, CollectionName>
        }
        

    export async function createFullPageProps<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
        >(
            config: GP, 
            clients: BackendBase.OnlineClientSet<GP["props"]>, 
            collectionName: CollectionName,
            itemId: string
            ): Promise<Utils.FullPageInjectionProps<GP, CollectionName>> {
        return {
            item: await createItemInjection(config, clients, collectionName, itemId),
            relations: await createRelationsInjection(config, clients, collectionName, itemId)
        }
    }

    export async function createSimpleProps<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
        >(
            config: GP, 
            clients: BackendBase.OnlineClientSet<GP["props"]>, 
            collectionName: CollectionName,
            itemId: string
        ): Promise<Utils.SimplePageInjectionProps<GP, CollectionName>> {
        return {
            item: await createItemInjection(config, clients, collectionName, itemId)
        }
    }

    type ConfigNodeBase = FieldConfig.ConfigBase | FieldConfig.Fields.EndpointTypes

    type TreeEntityBase = FieldConfig.EntityBase | FieldConfig.Fields.EndpointTypes
    type PropsTreeTitle<T extends TreeEntityBase> = T extends FieldConfig.EntityBase ? DbUiConfiguration.TitlesFor<T>: string
    type PropsTreeNode<T extends TreeEntityBase> = T extends FieldConfig.EntityBase ? Utils.InjectedEntity<T> : Utils.ItemInjectionEndpoint
    
    function renderStaticPropTree<T extends TreeEntityBase>(config: FieldConfig.ConfigFromDeclaration<T>, value: T, title: PropsTreeTitle<T>): PropsTreeNode<T> {
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
    
    function renderDynamicPropTree<T extends TreeEntityBase>(config: FieldConfig.ConfigFromDeclaration<T>, binding: XBinding.Binding<DeepPartial<T>>, parentValue: DeepPartial<T>, title: PropsTreeTitle<T>): PropsTreeNode<T> {
        if(FieldConfig.Fields.isEndpointType(config)) {
            if(typeof title !== "string") {
                throw new Error("Title is not string.")
            }
            if(binding.value !== undefined && !FieldConfig.isValidEndpointValue(config, binding.value)) {
                throw new Error("Invalid type")
            }
            return {
                $title: title,
                $element: renderDynamicEndpoint(config, binding as XBinding.Binding<FieldConfig.Fields.EndpointValueTypes>)
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

    function renderDynamicEndpoint(config: FieldConfig.Fields.EndpointTypes, binding: XBinding.Binding<FieldConfig.Fields.EndpointValueTypes | undefined>): React.ReactNode {
        return EndpointEditors.renderEndpoint(binding, config)
    }
}
