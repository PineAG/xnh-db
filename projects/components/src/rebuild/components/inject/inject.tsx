import { FieldConfig } from "@xnh-db/protocol";
import { DeepPartial } from "utility-types";
import { XBinding } from "../binding";
import { DbUiConfiguration } from "../../config";

import { BackendBase } from "../../data";
import { InheritanceUtils } from "../../data/inherit";
import { InjectionProps } from "./props";
import { RelationInjectionComponents } from "./relation";
import { InjectionParentComponents } from "./parents";

import CollNames = DbUiConfiguration.InternalUtils.CollNames
import Utils = DbUiConfiguration.InternalUtils.Injection
import GPBase = DbUiConfiguration.GlobalPropsBase
import { GlobalSyncComponents } from "../sync";
import { DbContexts } from "../context";


export module LayoutInjector {
    export type ItemDisplayInjection = Utils.ItemDisplayInjection<GPBase, string>

    export function useCreateItemInjection(collectionName: string) {
        const config = DbContexts.useProps()
        const collectionConfig = DbContexts.useCollectionConfig(collectionName)
        const clients = GlobalSyncComponents.useQueryClients()
        const collectionClient = clients.collections[collectionName]
        const inheritClient = clients.inheritance[collectionName]
        const titles = config.layout.titles.entityTitles[collectionName]

        const {useOpenItem, useOpenSearch} = config.actions
        const openItem = useOpenItem(collectionName)
        const openSearch = useOpenSearch(collectionName)

        return async (itemId: string): Promise<ItemDisplayInjection> => {
            console.log("BEFORE", itemId)
            const item = inheritClient ?
                await InheritanceUtils.getEntityPatchingParents(itemId, collectionConfig, collectionClient, inheritClient) :
                await collectionClient.getItemById(itemId)
                console.log("AFTER", itemId)
                console.log(collectionName, itemId, item)
            const injectProps = InjectionProps.renderStaticPropTree<FieldConfig.EntityBase>(collectionConfig, item, titles, {
                components: config.layout.global.endpoint.viewers,
                openItem, openSearch
            })
            return injectProps
        }
    }
    
    export type FullPageInjectionProps = Utils.FullPageInjectionProps<GPBase, string>

    export function useCreateFullPageProps(collectionName: string) {
        const createItemInjection = useCreateItemInjection(collectionName)
        const createRelationsInjection = RelationInjectionComponents.useCreateRelationsInjection(collectionName)
        return async (itemId: string): Promise<FullPageInjectionProps> => {
            return {
                item: await createItemInjection(itemId),
                $parentElement: () => <InjectionParentComponents.StaticParentElement collectionName={collectionName} itemId={itemId} />,
                relations: await createRelationsInjection(itemId)
            }
        }
    }

    export type SimplePageInjectionProps = Utils.SimplePageInjectionProps<GPBase, string>

    export function useCreateSimpleProps(collectionName: string) {
        const createItemInjection = useCreateItemInjection(collectionName)
        return async (itemId: string): Promise<SimplePageInjectionProps> => {
            return {
                item: await createItemInjection(itemId)
            }
        }
    }

    export type RelationBindingGroup = Record<string, XBinding.Binding<Record<string, string>[]>>

    export function useGetFullPagePropsFromBinding(collectionName: string) {
        const config = DbContexts.useProps()
        const clients = GlobalSyncComponents.useQueryClients()
        const collConf = config.props.collections[collectionName].config
        const titles = config.layout.titles.entityTitles[collectionName]
        const createRelationsEditableInjection = RelationInjectionComponents.useCreateRelationsEditableInjection(collectionName)

        const renderTree = InjectionProps.useRenderDynamicPropTree(collectionName)

        return (
            itemId: string,
            entityBinding: XBinding.Binding<DeepPartial<FieldConfig.EntityBase>>,
            parentBinding: XBinding.Binding<string | null>,
            relationBindings: RelationBindingGroup
        ): Utils.FullPageInjectionProps<DbUiConfiguration.GlobalPropsBase, string> => {
            const item = renderTree(collConf, entityBinding, undefined, titles as any)
            return {
                item,
                $parentElement: () => <InjectionParentComponents.ParentEditorElement
                    config={config}
                    clients={clients}
                    collectionName={collectionName}
                    binding={parentBinding}
                    itemId={itemId}
                />,
                relations: createRelationsEditableInjection(itemId, relationBindings)
            }
        }
    }

    export function useCreateSimplePagePropsFromBinding(collectionName: string) {
        const config = DbContexts.useProps()

        const collConf = config.props.collections[collectionName].config
        const titles = config.layout.titles.entityTitles[collectionName]

        const renderTree = InjectionProps.useRenderDynamicPropTree(collectionName)
        
        return (binding: XBinding.Binding<DeepPartial<FieldConfig.EntityBase>>): Utils.SimplePageInjectionProps<DbUiConfiguration.GlobalPropsBase, string> => {
            const item = renderTree(collConf, binding, undefined, titles as any)
            return { item }
        }
    }

    
}
