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

        return async (itemId: string): Promise<ItemDisplayInjection> => {
            const item = inheritClient ?
                await InheritanceUtils.getEntityPatchingParents(itemId, collectionConfig, collectionClient, inheritClient) :
                await collectionClient.getItemById(itemId)
            const injectProps = InjectionProps.renderStaticPropTree<FieldConfig.EntityBase>(config.layout.global.endpoint.viewers, collectionConfig, item, titles)
            return injectProps
        }
    }
    
    export type FullPageInjectionProps = Utils.FullPageInjectionProps<GPBase, string>

    export async function useCreateFullPageProps(collectionName: string) {
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

    export async function createSimpleProps(collectionName: string) {
        const createItemInjection = useCreateItemInjection(collectionName)
        return async (itemId: string): Promise<SimplePageInjectionProps> => {
            return {
                item: await createItemInjection(itemId)
            }
        }
    }

    export function getFullPagePropsFromBinding<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>,
        T extends FieldConfig.EntityFromConfig<GP["props"]["collections"][CollectionName]["config"]>
    >(
        config: GP,
        clients: BackendBase.OnlineClientSet<GP["props"]>,
        collectionName: CollectionName,
        itemId: string,
        entityBinding: XBinding.Binding<DeepPartial<T>>,
        parentBinding: XBinding.Binding<string | null>,
        relationBindings: RelationInjectionComponents.RelationBindings<GP, CollectionName>): Utils.FullPageInjectionProps<GP, CollectionName> {
        const collConf = config.props.collections[collectionName].config
        const titles = config.layout.titles.entityTitles[collectionName]
        const item = InjectionProps.renderDynamicPropTree(config.layout.global.endpoint.editors, collConf, entityBinding, undefined, titles as any) as Utils.ItemDisplayInjection<GP, CollectionName>
        return {
            item,
            $parentElement: () => <InjectionParentComponents.ParentEditorElementProps
                config={config}
                clients={clients}
                collectionName={collectionName}
                binding={parentBinding}
            />,
            relations: RelationInjectionComponents.createRelationsEditableInjection(config, clients, collectionName, itemId, relationBindings)
        }
    }

    export function getSimplePagePropsFromBinding<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>,
        T extends FieldConfig.EntityFromConfig<GP["props"]["collections"][CollectionName]["config"]>
    >(config: GP, collectionName: CollectionName, binding: XBinding.Binding<DeepPartial<T>>): Utils.SimplePageInjectionProps<GP, CollectionName> {
        const collConf = config.props.collections[collectionName].config
        const titles = config.layout.titles.entityTitles[collectionName]
        const item = InjectionProps.renderDynamicPropTree(config.layout.global.endpoint.editors, collConf, binding, undefined, titles as any) as Utils.ItemDisplayInjection<GP, CollectionName>
        return { item }
    }

    
}
