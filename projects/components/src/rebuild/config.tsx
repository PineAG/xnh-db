import { FieldConfig } from "@xnh-db/protocol"

export module DbUiConfiguration {
    import EntityBase = FieldConfig.EntityBase
    import ConfigFromDeclaration = FieldConfig.ConfigFromDeclaration
    
    export module Titles {
        export type TitleFor<T> = (
            T extends FieldConfig.Fields.EndpointValueTypes ?
                string :
            T extends EntityBase ? 
                ({$title: string} & {
                    [K in keyof T]: TitleFor<T[K]>
                }) :
            never
        )
    }

    export module Layouts {
        export type LayoutPropsEndpoint = {
            $title: string
            $element: React.ReactNode
        }
        export type ItemLayoutProps<T> = (
            T extends FieldConfig.Fields.EndpointValueTypes ?
                LayoutPropsEndpoint :
            T extends EntityBase ? 
                ({$title: string} & {
                    [K in keyof T]: ItemLayoutProps<T[K]>
                }) :
            never
        )

        export type LayoutPropsForRelations<ColToRel extends Configuration.CollectionToRelationProps<any, any, any>> = {
            [R in keyof ColToRel]: {
                $richListElement: React.ReactElement
                $simpleListElement: React.ReactElement
            }
        }

        export type Layout<
            T extends EntityBase,
            ColToRel extends Configuration.CollectionToRelationProps<any, any, any>
        > = {
            fullPage: React.FC<{item: ItemLayoutProps<T>, relations: LayoutPropsForRelations<ColToRel>}>
            searchResult: React.FC<{item: ItemLayoutProps<T>}>
            relationPreview: {
                rich: React.FC<{item: ItemLayoutProps<T>}>
                simple: React.FC<{item: ItemLayoutProps<T>}>
            }
        }
    }

    export module Configuration {
        export type CollectionProps<T extends EntityBase, Conf extends ConfigFromDeclaration<T>> = {
            config: Conf
            inheritable?: boolean
            entityTitles: Titles.TitleFor<T>
        }

        export type CollectionSetBase = Record<string, CollectionProps<any, any>>

        export type RelationMappingBase<CollectionNames extends string> = Record<string, CollectionNames>

        export type RelationProps<GlobalCollectionNames extends string, Collections extends RelationMappingBase<GlobalCollectionNames>, Payload extends EntityBase, PayloadConf extends ConfigFromDeclaration<Payload>> = {
            collections: Collections
            payloadConfig: PayloadConf
            payloadTitles: Titles.TitleFor<Payload>
        }

        export type RelationSetBase<GlobalCollectionNames extends string> = Record<string, RelationProps<GlobalCollectionNames, any, any, any>>

        type KeysWithValue<T extends Record<string, string>, Value extends string> = {
            [K in keyof T]: T[K] extends Value ? K : never
        }[keyof T]

        export type CollectionToRelationPropsItem<CollNames extends string, ColName extends string, Relations extends RelationSetBase<CollNames>, Rel extends keyof Relations> = {
            relation: Rel
        } & CollectionToRelationPropsItemOptions<CollNames, ColName, Relations, Rel>

        export type CollectionToRelationPropsItemOptions<CollNames extends string, ColName extends string, Relations extends RelationSetBase<CollNames>, Rel extends keyof Relations> = {
            title: string
            selfKey: KeysWithValue<Relations[Rel]["collections"], ColName>
            targetKey: keyof Relations[Rel]["collections"]
        }

        export type CollectionToRelationProps<CollNames extends string, ColName extends string, Relations extends RelationSetBase<CollNames>> = Record<string, CollectionToRelationPropsItem<CollNames, ColName, Relations, keyof Relations>>
        export type CollectionToRelationsBase<CollNames extends string, Relations extends RelationSetBase<CollNames>> = {
            [CollName in CollNames]: CollectionToRelationProps<CollNames, CollName, Relations>
        }

        export type CollectionLayoutProps<C extends CollectionProps<any, any>, ColToRel extends CollectionToRelationProps<any, any, any>> = (
            C extends CollectionProps<infer Entity, any> ?
                Layouts.Layout<Entity, ColToRel> :
                never
        )

        export type LayoutProps<
            Collections extends CollectionSetBase,
            ColToRel extends CollectionToRelationsBase<Extract<keyof Collections, string>, any>> = {
                [C in Extract<keyof Collections, string>]: 
                    Layouts.Layout<
                        FieldConfig.EntityFromConfig<Collections[C]["config"]>,
                        ColToRel[C]
                    >
        }

        export type Props<
            Collections extends CollectionSetBase, 
            Relations extends RelationSetBase<Extract<keyof Collections, string>>, 
            ColToRel extends CollectionToRelationsBase<Extract<keyof Collections, string>, Relations>
        > = {
            collections: Collections,
            relations: Relations,
            collectionsToRelations: ColToRel,
            layouts: LayoutProps<Collections, ColToRel>
        }
    }

    export module Builders {
        
        export const makeCollection = {
            createCollectionOfEntity: <T extends EntityBase>() => ({
            withConfig: <Conf extends ConfigFromDeclaration<T>>(config: Conf) => ({
            withTitles: (entityTitles: Titles.TitleFor<T>): Configuration.CollectionProps<T, Conf> => ({
                entityTitles, config
            }) }) })
        }

        type CollectionBuilder = typeof makeCollection
        
        export function createRelationsBuilder<GlobalCollectionNames extends string>() {
            return {
                createRelation: () => ({
                ofCollections: <RelCollections extends Configuration.RelationMappingBase<GlobalCollectionNames>>(collections: RelCollections) => ({
                withPayload: <Payload extends EntityBase>() => ({
                withPayloadConfig: <PayloadConfig extends ConfigFromDeclaration<Payload>>(payloadConfig: PayloadConfig) => ({
                withPayloadTitles: (payloadTitles: Titles.TitleFor<Payload>): Configuration.RelationProps<
                    GlobalCollectionNames, 
                    RelCollections, 
                    Payload, 
                    PayloadConfig
                > => ({
                    collections,
                    payloadTitles,
                    payloadConfig
                }) }) }) }) })
            }
        }

        export function createCollectionToRelationBuilder<CollNames extends string, Relations extends Configuration.RelationSetBase<CollNames>>() {
            type RelNames = keyof Relations
            return {
                forCollection: <ColName extends CollNames>(collection: ColName) => ({
                    forRelation: <Rel extends RelNames>(relation: Rel) => ({
                        withOptions: (options: Configuration.CollectionToRelationPropsItemOptions<CollNames, ColName, Relations, Rel>): Configuration.CollectionToRelationPropsItem<CollNames, ColName, Relations, Rel> => ({
                            relation,
                            ...options
                        })
                    })
                })
            }
        }

        export const makeConfig = {
            withCollections: <Collections extends Configuration.CollectionSetBase>(collectionsMaker: (b: CollectionBuilder) => Collections) => {
                const collections = collectionsMaker(makeCollection)
                type CollectionNames = Extract<keyof Collections, string>
                const relationBuilder = createRelationsBuilder<CollectionNames>()
                return {
                    withRelations: <Relations extends Configuration.RelationSetBase<CollectionNames>>(relationsMaker: (b: typeof relationBuilder) => Relations) => {
                        const relations = relationsMaker(relationBuilder)
                        type RelationNames = Extract<keyof Relations, string>
                        type ColToRelBase = Configuration.CollectionToRelationsBase<CollectionNames, Relations>
                        return {
                            collectionsToRelations: <ColToRel extends ColToRelBase>(colToRel: ColToRel) => ({
                                withLayouts: (layouts: Configuration.LayoutProps<Collections, ColToRel>): Configuration.Props<Collections, Relations, ColToRel> => ({
                                    collections,
                                    relations,
                                    collectionsToRelations: colToRel,
                                    layouts
                                })
                            })
                        }
                    }
                }
            }
        }

    }

    export const makeConfig = Builders.makeConfig
}
