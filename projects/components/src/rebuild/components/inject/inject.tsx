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


export module LayoutInjector {    
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
        const injectProps = InjectionProps.renderStaticPropTree<FieldConfig.EntityBase>(collectionConfig, item, titles)
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
            $parentElement: () => <InjectionParentComponents.StaticParentElement config={config} clients={clients} collectionName={collectionName} itemId={itemId} />,
            relations: await RelationInjectionComponents.createRelationsInjection(config, clients, collectionName, itemId)
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
        const item = InjectionProps.renderDynamicPropTree(collConf, entityBinding, undefined, titles as any) as Utils.ItemDisplayInjection<GP, CollectionName>
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
        const item = InjectionProps.renderDynamicPropTree(collConf, binding, undefined, titles as any) as Utils.ItemDisplayInjection<GP, CollectionName>
        return { item }
    }

    
}
