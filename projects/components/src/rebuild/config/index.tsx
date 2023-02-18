import { FieldConfig } from "@xnh-db/protocol"
import { XBinding } from "../components/binding"
import { DBConfigActions } from "./actions"
import { InternalGlobalLayouts } from "./globalLayouts"
export * from "./globalLayouts"

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

        export type RelationPropsEndpoint = {
            $element: () => React.ReactElement
        }

        export type LayoutPropsForRelations<ColToRel extends Configuration.CollectionToRelationProps<any, any, any>> = {
            [R in keyof ColToRel]: RelationPropsEndpoint
        }

        export module EntityLayoutProps {
            export type FullPage<T extends EntityBase, ColToRel extends Configuration.CollectionToRelationProps<any, any, any>> = {
                item: ItemLayoutProps<T>,
                $parentElement: () => React.ReactNode
                relations: LayoutPropsForRelations<ColToRel>
            }
            export type SimplePage<T extends EntityBase> = {item: ItemLayoutProps<T>}
        }

        export type EntityLayout<
            T extends EntityBase,
            ColToRel extends Configuration.CollectionToRelationProps<any, any, any>
        > = {
            fullPage: React.FC<EntityLayoutProps.FullPage<T, ColToRel>>
            newPage: React.FC<EntityLayoutProps.SimplePage<T>>,
            searchResult: React.FC<EntityLayoutProps.SimplePage<T>>
            previewItem: React.FC<EntityLayoutProps.SimplePage<T>>
        }

        export type PayloadRelationPreviewLayoutProps<
            Collections extends Configuration.CollectionSetBase, 
            Relations extends Configuration.RelationSetBase<Extract<keyof Collections, string>>,
            Relation extends keyof Relations
        > = {
            selfKey: keyof Relations[Relation]["collections"],
            targetKey: keyof Relations[Relation]["collections"],
            payload: ItemLayoutProps<FieldConfig.EntityFromConfig<Relations[Relation]["payloadConfig"]>>,
            collections: {
                [C in keyof Relations[Relation]["collections"]]:
                    ItemLayoutProps<FieldConfig.EntityFromConfig<Collections[Relations[Relation]["collections"][C]]["config"]>>
            }
        }

        export type PayloadRelationEditorLayoutProps<
            Collections extends Configuration.CollectionSetBase, 
            Relations extends Configuration.RelationSetBase<Extract<keyof Collections, string>>,
            Relation extends keyof Relations
        > = {
            payload: ItemLayoutProps<FieldConfig.EntityFromConfig<Relations[Relation]["payloadConfig"]>>
        }

        export type PayloadLayout<
            Collections extends Configuration.CollectionSetBase, 
            Relations extends Configuration.RelationSetBase<Extract<keyof Collections, string>>,
            Relation extends keyof Relations
        > = {
            relationPreview: React.FC<PayloadRelationPreviewLayoutProps<Collections, Relations, Relation>>
            payloadEditor: React.FC<PayloadRelationEditorLayoutProps<Collections, Relations, Relation>>
        }
    }

    export module Configuration {
        export type CollectionProps<T extends EntityBase, Conf extends ConfigFromDeclaration<T>> = {
            config: Conf
            inheritable?: boolean
        }

        export type CollectionSetBase = Record<string, CollectionProps<any, any>>

        export type RelationMappingBase<CollectionNames extends string> = Record<string, CollectionNames>

        export type RelationProps<GlobalCollectionNames extends string, Collections extends RelationMappingBase<GlobalCollectionNames>, Payload extends EntityBase, PayloadConf extends ConfigFromDeclaration<Payload>> = {
            collections: Collections
            payloadConfig: PayloadConf
        }

        export type RelationSetBase<GlobalCollectionNames extends string> = Record<string, RelationProps<GlobalCollectionNames, any, any, any>>

        type KeysWithValue<T extends Record<string, string>, Value extends string> = {
            [K in keyof T]: T[K] extends Value ? K : never
        }[keyof T]

        // type KeysWithValue<T extends Record<string, string>, Value extends string> = keyof T

        export type CollectionToRelationPropsItem<CollNames extends string, ColName extends string, Relations extends RelationSetBase<CollNames>, Rel extends keyof Relations> = {
            relation: Extract<Rel, string>
        } & CollectionToRelationPropsItemOptions<ColName, Relations[Rel]>

        export type CollectionToRelationPropsItemOptions<ColName extends string, Relation extends Configuration.RelationProps<any, any, any, any>> = {
            selfKey: Extract<KeysWithValue<Relation["collections"], ColName>, string>
            targetKey: Extract<keyof Relation["collections"], string>
        }

        export type CollectionToRelationProps<CollNames extends string, ColName extends string, Relations extends RelationSetBase<CollNames>> = Record<string, CollectionToRelationPropsItem<CollNames, ColName, Relations, keyof Relations>>
        export type CollectionToRelationsBase<CollNames extends string, Relations extends RelationSetBase<CollNames>> = {
            [CollName in CollNames]: CollectionToRelationProps<CollNames, CollName, Relations>
        }

        export type CollectionLayoutProps<C extends CollectionProps<any, any>, ColToRel extends CollectionToRelationProps<any, any, any>> = (
            C extends CollectionProps<infer Entity, any> ?
                Layouts.EntityLayout<Entity, ColToRel> :
                never
        )

        export type EntityLayoutProps<
            Collections extends CollectionSetBase,
            ColToRel extends CollectionToRelationsBase<Extract<keyof Collections, string>, any>> = {
                [C in Extract<keyof Collections, string>]: 
                    Layouts.EntityLayout<
                        FieldConfig.EntityFromConfig<Collections[C]["config"]>,
                        ColToRel[C]
                    >
        }

        export type PayloadLayoutProps<
            Collections extends CollectionSetBase,
            Relations extends RelationSetBase<Extract<keyof Collections, string>>,
        > = {
            [R in keyof Relations]: 
                Layouts.PayloadLayout<
                    Collections,
                    Relations,
                    R
                >
        }

        export type LayoutProps<
            Collections extends CollectionSetBase,
            Relations extends RelationSetBase<Extract<keyof Collections, string>>,
            ColToRel extends CollectionToRelationsBase<Extract<keyof Collections, string>, Relations>
        > = {
            entities: EntityLayoutProps<Collections, ColToRel>,
            payloads: PayloadLayoutProps<Collections, Relations>
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
        export type DataPropsBase = DataProps<CollectionSetBase, RelationSetBase<string>, CollectionToRelationsBase<any, any>>
        // export type DataPropsBase = ReturnType<<
        //     Collections extends CollectionSetBase,
        //     CollectionNames extends Extract<keyof Collections, string>,
        //     Relations extends RelationSetBase<CollectionNames>,
        //     ColToRel extends CollectionToRelationsBase<CollectionNames, Relations>,
        //     Ret extends DataProps<Collections, Relations, ColToRel>
        // >() => Ret>

        // export type LayoutProps<DProps extends DataProps<CollectionSetBase, any, any>> = LayoutPropsFromProps<DProps["collections"], DProps["collectionsToRelations"]>

        export type LayoutPropsBase = EntityLayoutProps<CollectionSetBase, any>

        type TitleDisplayProps<
            Collections extends CollectionSetBase, 
            Relations extends RelationSetBase<Extract<keyof Collections, string>>
            > = {
                entityTitles: {
                    [C in keyof Collections]: Titles.TitleFor<FieldConfig.EntityFromConfig<Collections[C]["config"]>>
                },
                payloadTitles: {
                    [R in keyof Relations]: Titles.TitleFor<FieldConfig.EntityFromConfig<Relations[R]["payloadConfig"]>>
                }
            }
        export type DisplayProps<
            Props extends DataPropsBase
            > = {
                titles: TitleDisplayProps<Props["collections"], Props["relations"]>
                layouts: Configuration.LayoutProps<Props["collections"], Props["relations"], Props["collectionsToRelations"]>
                global: InternalGlobalLayouts.GlobalLayoutProps
            }
        
        export type GlobalProps<Props extends DataPropsBase> = {
            props: Props
            layout: DisplayProps<Props>
            actions: DBConfigActions.Actions<Props>
        }

        export type GlobalPropsBase = GlobalProps<DataPropsBase>
    }

    module Builders {
        
        export const makeCollection = {
            createCollectionOfEntity: <T extends EntityBase = never>(inheritable?: boolean) => ({
            withConfig: <Conf extends ConfigFromDeclaration<T>>(config: Conf) => ({
                config, inheritable
            }) })
        }

        type CollectionBuilder = typeof makeCollection
        
        export function createRelationsBuilder<GlobalCollectionNames extends string>() {
            return {
                createRelation: () => ({
                ofCollections: <RelCollections extends Configuration.RelationMappingBase<GlobalCollectionNames> = never>(collections: RelCollections) => ({
                withPayload: <Payload extends EntityBase = never>() => ({
                withPayloadConfig: <PayloadConfig extends ConfigFromDeclaration<Payload>>(payloadConfig: PayloadConfig): Configuration.RelationProps<
                    GlobalCollectionNames, 
                    RelCollections, 
                    Payload, 
                    PayloadConfig
                > => ({
                    collections,
                    payloadConfig
                }) }) }) })
            }
        }

        export function createCollectionToRelationBuilder<CollNames extends string, CollName extends CollNames, Relations extends Configuration.RelationSetBase<CollNames>>() {
            type RelNames = keyof Relations
            return {
                toRelation: <Rel extends Extract<RelNames, string>>(relation: Rel, options: Configuration.CollectionToRelationPropsItemOptions<CollName, Relations[Rel]>): Configuration.CollectionToRelationPropsItem<CollNames, CollName, Relations, Rel> => {
                    return {
                        relation: relation as any,
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

        export function makeDisplayProps<Props extends Configuration.DataPropsBase>(config: Props, layouts: Configuration.DisplayProps<Props>): Configuration.DisplayProps<Props> {
            return layouts
        }
    }

    export type DataPropsBase = Configuration.DataPropsBase
    export type LayoutPropsBase = Configuration.LayoutPropsBase
    // export type LayoutProps<Props extends DataPropsBase> = Configuration.LayoutProps<Props["collections"], Props["collectionsToRelations"]>
    export type DisplayProps<Props extends DataPropsBase> = Configuration.DisplayProps<Props>
    export type GlobalPropsBase = Configuration.GlobalPropsBase

    export const makeConfig = Builders.makeConfig
    export const makeDisplayProps = Builders.makeDisplayProps

    export type TitlesFor<T extends EntityBase> = Titles.TitleFor<T>

    export module wrapLayout {
        export function fullPage<
            Props extends Configuration.DataPropsBase, 
            CollectionName extends keyof Props["collections"]
            >(config: Props, collection: CollectionName, component: React.FC<LayoutProps.FullPage<Props, CollectionName>>) {
                return component
        }

        export function newPage<
            Props extends Configuration.DataPropsBase, 
            CollectionName extends keyof Props["collections"]
            >(config: Props, collection: CollectionName, component: React.FC<LayoutProps.SearchResult<Props, CollectionName>>) {
                return component
        }
        
        export function searchResult<
            Props extends Configuration.DataPropsBase, 
            CollectionName extends keyof Props["collections"]
            >(config: Props, collection: CollectionName, component: React.FC<LayoutProps.SearchResult<Props, CollectionName>>) {
                return component
        }

        // export function previewPage<
        //     Props extends Configuration.DataPropsBase, 
        //     CollectionName extends keyof Props["collections"]
        //     >(config: Props, collection: CollectionName, component: React.FC<LayoutProps.PreviewPage<Props, CollectionName>>) {
        //         return component
        // }

        export function previewItem<
            Props extends Configuration.DataPropsBase, 
            CollectionName extends keyof Props["collections"]
            >(config: Props, collection: CollectionName, component: React.FC<LayoutProps.PreviewItem<Props, CollectionName>>) {
                return component
        }

        export function payloadPreview<
            Props extends Configuration.DataPropsBase, 
            RelName extends keyof Props["relations"]
        >(config: Props, relation: RelName, 
                component: React.FC<Layouts.PayloadRelationPreviewLayoutProps<Props["collections"], Props["relations"], RelName>>) {
                return component
        }

        export function payloadEditor<
            Props extends Configuration.DataPropsBase, 
            RelName extends keyof Props["relations"]
        >(config: Props, relation: RelName, 
                component: React.FC<Layouts.PayloadRelationEditorLayoutProps<Props["collections"], Props["relations"], RelName>>) {
                return component
        }
    }

    export module LayoutProps {
        type PropsBase = Configuration.DataPropsBase
        type GetEntityFromProps<Props extends PropsBase, CollectionName extends keyof Props["collections"]> = FieldConfig.EntityFromConfig<Props["collections"][CollectionName]["config"]>

        export type FullPage<
            Props extends PropsBase, 
            CollectionName extends keyof Props["collections"]
        > = Layouts.EntityLayoutProps.FullPage<
            GetEntityFromProps<Props, CollectionName>, 
            Props["collectionsToRelations"][CollectionName]>
        
        type SimplePage<
            Props extends PropsBase,
            CollectionName extends keyof Props["collections"]
            > = Layouts.EntityLayoutProps.SimplePage<GetEntityFromProps<Props, CollectionName>>
        
        export type SearchResult<
            Props extends PropsBase,
            CollectionName extends keyof Props["collections"]> = SimplePage<Props, CollectionName>
        
        export type PreviewPage<
            Props extends PropsBase,
            CollectionName extends keyof Props["collections"]> = SimplePage<Props, CollectionName>
        
        export type PreviewItem<
            Props extends PropsBase,
            CollectionName extends keyof Props["collections"]> = SimplePage<Props, CollectionName>
            
    }

    export module InternalUtils {
        export module Injection {
            export type InjectedEntity<T extends EntityBase> = Layouts.ItemLayoutProps<T>
            export type ItemInjectionEndpoint = Layouts.LayoutPropsEndpoint
            export type RelationInjectionEndpoint = Layouts.RelationPropsEndpoint
            export type ItemDisplayInjection<
                GP extends Configuration.GlobalPropsBase,
                CollectionName extends keyof GP["props"]["collections"]
                > = Layouts.ItemLayoutProps<FieldConfig.EntityFromConfig<GP["props"]["collections"][CollectionName]["config"]>>

            export type RelationsDisplayInjection<
                GP extends Configuration.GlobalPropsBase,
                CollectionName extends keyof GP["props"]["collections"]
                > = Layouts.LayoutPropsForRelations<GP["props"]["collectionsToRelations"][CollectionName]>
            
            export type FullPageInjectionProps<
                GP extends Configuration.GlobalPropsBase,
                CollectionName extends keyof GP["props"]["collections"]
                > = Layouts.EntityLayoutProps.FullPage<
                    FieldConfig.EntityFromConfig<GP["props"]["collections"][CollectionName]["config"]>,
                    GP["props"]["collectionsToRelations"][CollectionName]
                >
            export type SimplePageInjectionProps<
                GP extends Configuration.GlobalPropsBase,
                CollectionName extends keyof GP["props"]["collections"]
                > = Layouts.EntityLayoutProps.SimplePage<FieldConfig.EntityFromConfig<GP["props"]["collections"][CollectionName]["config"]>>
            }
            
            export type CollNames<GP extends Configuration.GlobalPropsBase> = Extract<keyof GP["props"]["collections"], string>
            export type RelName<GP extends Configuration.GlobalPropsBase> = Extract<keyof GP["props"]["relations"], string>
    }
}
