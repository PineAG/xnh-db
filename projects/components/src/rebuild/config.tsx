import { FieldConfig, IOfflineClient, IOnlineClient } from "@xnh-db/protocol"
import { IdbCollectionQuery } from "../legacy"

export module XnhDbUiConfiguration {
    export module PropsUtil {
        type DBQuery = IdbCollectionQuery

        // One collection
        export interface CollectionBase {
            [key: string]: string | number | string[] | CollectionBase
        } 

        // A set of collections
        export type CollectionSetBase = Record<string, CollectionBase>
        
        // Collections => configs
        export type CollectionSetConfigBase<C extends CollectionSetBase> = {
            [K in keyof C]: FieldConfig.ConfigFromDeclaration<C[K]>
        }

        // Collections => Offline clients
        export type CollectionOfflineClientBase<C extends CollectionSetBase> = {
            [K in keyof C]: IOfflineClient.Collection<C[K]>
        }

        // Collections => Online clients
        export type CollectionOnlineClientBase<C extends CollectionSetBase> = {
            [K in keyof C]: IOnlineClient.Collection<C[K], DBQuery>
        }

        // One relation, {keyName: Collection}
        export type RelationBase<C extends CollectionSetBase> = Record<string, C[keyof C]>

        // Relation Item
        export type RelationSetItemBase<R extends RelationBase<any>> = {
            collections: R
            payload: any
        }

        // A set of relations
        export type RelationSetBase<C extends CollectionSetBase> = Record<string, RelationSetItemBase<RelationBase<C>>>

        // Relations => Offline clients
        export type RelationOfflineClientBase<R extends RelationSetBase<any>> = {
            [K in keyof R]: IOfflineClient.Relation<Extract<keyof R[K]["collections"], string>, keyof R[K]["payload"]>
        }

        // Relations => Online clients
        export type RelationOnlineClientBase<R extends RelationSetBase<any>> = {
            [K in keyof R]: IOnlineClient.Relation<Extract<keyof R[K]["collections"], string>, keyof R[K]["payload"]>
        }

        // Global offline clients
        export type OfflineClientSetGlobalProps<Collections extends CollectionSetBase, Relations extends RelationSetBase<Collections>> = {
            collections: CollectionOfflineClientBase<Collections>
            relations: RelationOfflineClientBase<Relations>
            files: IOfflineClient.Files
        }

        // Online inherit client
        export type OnlineInheritItem<C extends CollectionBase> = {
            collections: {
                parent: C
                child: C
            }
            payload: {}
        }

        // Online inherit client set
        export type OnlineInheritClients<Collections extends CollectionSetBase> = {
            [K in keyof Collections]: OnlineInheritItem<Collections[K]>
        }

        // Global online clients
        export type OnlineClientSetGlobalProps<Collections extends CollectionSetBase, Relations extends RelationSetBase<Collections>> = {
            collections: CollectionOfflineClientBase<Collections>
            inheritance: Partial<OnlineInheritClients<Collections>>
            relations: RelationOnlineClientBase<Relations>
            tags: IOnlineClient.Tags
            files: IOnlineClient.Files
        }

        // Global clients
        export type GlobalClients<Collections extends CollectionSetBase, Relations extends RelationSetBase<Collections>> = {
            query: OnlineClientSetGlobalProps<Collections, Relations>
            local: OfflineClientSetGlobalProps<Collections, Relations>
            remote: OfflineClientSetGlobalProps<Collections, Relations>
        }

        
        export type CollectionQueryClientBase<Relations extends RelationSetBase<any>, Name extends keyof Relations> = {
            relation: Name
            selfKey: keyof Relations[Name]["collections"]
            targetKey: keyof Relations[Name]["collections"]
        }

        export type CollectionRelationConfigBase<Relations extends RelationSetBase<any>> = Record<string, CollectionQueryClientBase<Relations, keyof Relations>>

        export type CollectionsConfigBase<C extends CollectionBase, Relations extends RelationSetBase<any>> = {
            config: FieldConfig.ConfigFromDeclaration<C>
            relations: CollectionRelationConfigBase<Relations>
        }

        export type PropsBase<Collections extends CollectionSetBase, Relations extends RelationSetBase<Collections>, CollectionsConfig extends CollectionsConfigBase<Collections, Relations>> = {
            clients: GlobalClients<Collections, Relations>
            collections: CollectionsConfig
        }
    }

    export function makeConfig<Props extends PropsUtil.PropsBase<any, any, any>>(props: Props): Props {
        return props
    }
}

export module XnhDbUiConfiguration {

}
