import { DbUiConfiguration } from "../config";

import CollNames = DbUiConfiguration.InternalUtils.CollNames
import Utils = DbUiConfiguration.InternalUtils.Injection
import GPBase = DbUiConfiguration.GlobalPropsBase

export module LayoutInjector {
    export function createItemInjection<GP extends GPBase, CollectionName extends CollNames<GP>>(config: GP, collection: CollectionName): Utils.ItemDisplayInjection<GP, CollectionName> {

    }

    export function createRelationsInjection<GP extends GPBase, CollectionName extends CollNames<GP>>(config: GP, collection: CollectionName): Utils.RelationsDisplayInjection<GP, CollectionName> {
        const result: Partial<Utils.RelationsDisplayInjection<GP, CollectionName>> = {}
        const collToRel = config.props.collectionsToRelations[collection]
        for(const relName in collToRel) {
            const {relation: realRelName, targetKey} = collToRel[relName]
            const relation = config.props.relations[realRelName as string]
            const targetCollectionName: string = relation.collections[targetKey]
            const collectionLayout = 
        }
    }

    export function createFullPageProps<GP extends GPBase, CollectionName extends CollNames<GP>>(config: GP, collection: CollectionName): Utils.FullPageInjectionProps<GP, CollectionName> {
        return {
            item: createItemInjection(config, collection),
            relations: createRelationsInjection(config, collection)
        }
    }

    export function createSimpleProps<GP extends GPBase, CollectionName extends CollNames<GP>>(config: GP, collection: CollectionName): Utils.SimplePageInjectionProps<GP, CollectionName> {
        return {
            item: createItemInjection(config, collection)
        }
    }
}
