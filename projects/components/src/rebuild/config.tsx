import { FieldConfig } from "@xnh-db/protocol"

export module DbUiConfiguration {
    import EntityBase = FieldConfig.EntityBase
    import ConfigFromDeclaration = FieldConfig.ConfigFromDeclaration
    
    module Titles {
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

    module Layouts {
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

        export module LayoutProps {
            export type FullPage<T extends EntityBase, ColToRel extends Configuration.CollectionToRelationProps<any, any, any>> = {
                item: ItemLayoutProps<T>, 
                relations: LayoutPropsForRelations<ColToRel>
            }
            export type SimplePage<T extends EntityBase> = {item: ItemLayoutProps<T>}
        }

        export type Layout<
            T extends EntityBase,
            ColToRel extends Configuration.CollectionToRelationProps<any, any, any>
        > = {
            fullPage: React.FC<LayoutProps.FullPage<T, ColToRel>>
            searchResult: React.FC<LayoutProps.SimplePage<T>>
            relationPreview: {
                rich: React.FC<LayoutProps.SimplePage<T>>
                simple: React.FC<LayoutProps.SimplePage<T>>
            }
        }
    }

    module Configuration {
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

        // type KeysWithValue<T extends Record<string, string>, Value extends string> = keyof T

        export type CollectionToRelationPropsItem<CollNames extends string, ColName extends string, Relations extends RelationSetBase<CollNames>, Rel extends keyof Relations> = {
            relation: Rel
        } & CollectionToRelationPropsItemOptions<ColName, Relations[Rel]>

        export type CollectionToRelationPropsItemOptions<ColName extends string, Relation extends Configuration.RelationProps<any, any, any, any>> = {
            selfKey: KeysWithValue<Relation["collections"], ColName>
            targetKey: keyof Relation["collections"]
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

        export type LayoutPropsFromProps<
            Collections extends CollectionSetBase,
            ColToRel extends CollectionToRelationsBase<Extract<keyof Collections, string>, any>> = {
                [C in Extract<keyof Collections, string>]: 
                    Layouts.Layout<
                        FieldConfig.EntityFromConfig<Collections[C]["config"]>,
                        ColToRel[C]
                    >
        }

        export type DataProps<
            Collections extends CollectionSetBase, 
            Relations extends RelationSetBase<Extract<keyof Collections, string>>, 
            ColToRel extends CollectionToRelationsBase<Extract<keyof Collections, string>, Relations>
        > = {
            collections: Collections,
            relations: Relations,
            collectionsToRelations: ColToRel
        }
        export type DataPropsBase = DataProps<CollectionSetBase, RelationSetBase<any>, CollectionToRelationsBase<any, any>>

        export type LayoutProps<DProps extends DataProps<CollectionSetBase, any, any>> = LayoutPropsFromProps<DProps["collections"], DProps["collectionsToRelations"]>

        export type LayoutPropsBase = LayoutPropsFromProps<CollectionSetBase, any>
    }

    module Builders {
        
        export const makeCollection = {
            createCollectionOfEntity: <T extends EntityBase>(inheritable?: boolean) => ({
            withConfig: <Conf extends ConfigFromDeclaration<T>>(config: Conf) => ({
            withTitles: (entityTitles: Titles.TitleFor<T>): Configuration.CollectionProps<T, Conf> => ({
                entityTitles, config, inheritable
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

        export function createCollectionToRelationBuilder<CollNames extends string, CollName extends CollNames, Relations extends Configuration.RelationSetBase<CollNames>>() {
            type RelNames = keyof Relations
            return {
                toRelation: <Rel extends RelNames>(relation: Rel, options: Configuration.CollectionToRelationPropsItemOptions<CollName, Relations[Rel]>): Configuration.CollectionToRelationPropsItem<CollNames, CollName, Relations, Rel> => {
                    return {
                        relation,
                        ...options
                    }   
                }
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
                        type ColToRelOptions<K extends CollectionNames, R extends RelationNames> = Configuration.CollectionToRelationPropsItemOptions<K, Relations[R]>
                        type ColToRelItem<K extends CollectionNames, R extends RelationNames> = Configuration.CollectionToRelationPropsItem<CollectionNames, K, Relations, R>
                        type CreateCollectionToRelationBuilder<K extends CollectionNames> = {
                            toRelation: <Rel extends RelationNames>(relation: Rel, options: ColToRelOptions<K, Rel>) => ColToRelItem<K, Rel>
                        }
                        type ColToRelBuilderPropsBase = {
                            [K in CollectionNames]: (b: CreateCollectionToRelationBuilder<K>) => Record<string, Configuration.CollectionToRelationPropsItem<CollectionNames, K, Relations, any>>
                        }
                        return {
                            collectionsToRelations: <ColToRelProps extends ColToRelBuilderPropsBase>(buildColToRel: ColToRelProps) => {
                                type ColToRel = {
                                    [C in CollectionNames]: {
                                        [R in keyof ReturnType<ColToRelProps[C]>]: ReturnType<ColToRelProps[C]>[R]
                                    }
                                } & Configuration.CollectionToRelationsBase<CollectionNames, Relations>
                                const colToRel = Object.fromEntries(Object.entries(buildColToRel).map(([coll, func]) => {
                                    const result = func({
                                        toRelation: (rel, options) => ({relation: rel, ...options})
                                    })
                                    return [coll, result]
                                })) as ColToRel
                                
                                return {
                                    done: (): Configuration.DataProps<Collections, Relations, ColToRel> => ({
                                        collections,
                                        relations,
                                        collectionsToRelations: colToRel
                                    })
                                }
                            }
                        }
                    }
                }
            }
        }

        export function makeLayouts<Props extends Configuration.DataPropsBase>(config: Props, layouts: Configuration.LayoutPropsFromProps<Props["collections"], Props["collectionsToRelations"]>) {
            return layouts
        }

    }

    export type DataPropsBase = Configuration.DataPropsBase
    export type LayoutPropsBase = Configuration.LayoutPropsBase

    export const makeConfig = Builders.makeConfig
    export const makeLayouts = Builders.makeLayouts

    export type TitlesFor<T extends EntityBase> = Titles.TitleFor<T>

    export module wrapLayout {
        export function fullPage<
            Props extends Configuration.DataPropsBase, 
            CollectionName extends keyof Props["collections"]
            >(config: Props, collection: CollectionName, component: React.FC<LayoutProps.FullPage<Props, CollectionName>>) {
                return component
        }

        
        export function searchResult<
            Props extends Configuration.DataPropsBase, 
            CollectionName extends keyof Props["collections"]
            >(config: Props, collection: CollectionName, component: React.FC<LayoutProps.SearchResult<Props, CollectionName>>) {
                return component
        }

        export function relation<
            Props extends Configuration.DataPropsBase, 
            CollectionName extends keyof Props["collections"]
            >(config: Props, collection: CollectionName, component: React.FC<LayoutProps.Relation<Props, CollectionName>>) {
                return component
        }
    }

    export module LayoutProps {
        type PropsBase = Configuration.DataPropsBase
        type GetEntityFromProps<Props extends PropsBase, CollectionName extends keyof Props["collections"]> = FieldConfig.EntityFromConfig<Props["collections"][CollectionName]["config"]>

        export type FullPage<
            Props extends PropsBase, 
            CollectionName extends keyof Props["collections"]
        > = Layouts.LayoutProps.FullPage<
            GetEntityFromProps<Props, CollectionName>, 
            Props["collectionsToRelations"][CollectionName]>
        
        type SimplePage<
            Props extends PropsBase,
            CollectionName extends keyof Props["collections"]
            > = Layouts.LayoutProps.SimplePage<GetEntityFromProps<Props, CollectionName>>
        
        export type SearchResult<
            Props extends PropsBase,
            CollectionName extends keyof Props["collections"]> = SimplePage<Props, CollectionName>
        
        export type Relation<
            Props extends PropsBase,
            CollectionName extends keyof Props["collections"]> = SimplePage<Props, CollectionName>
            
    }
}
