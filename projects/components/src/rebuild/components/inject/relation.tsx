import { FieldConfig, IOnlineClient } from "@xnh-db/protocol"
import { useEffect, useState } from "react"
import { DbUiConfiguration } from "../../config"
import { BackendBase } from "../../data"
import { InheritanceUtils } from "../../data/inherit"
import { XBinding } from "../binding"
import { DbContexts } from "../context"
import { SearchResultComponents } from "../search"
import { InjectionProps } from "./props"
import GPBase = DbUiConfiguration.GlobalPropsBase
import CollNames = DbUiConfiguration.InternalUtils.CollNames
import RelNames = DbUiConfiguration.InternalUtils.RelName
import Utils = DbUiConfiguration.InternalUtils.Injection

export module RelationInjectionComponents {
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
                relations={relations}
                Body={RelationRichItemWrapper}
                bodyProps={{}}
                />,
            $simpleListElement: () => <RelationListWrapper
                config={config}
                collectionName={collectionName}
                clients={clients}
                relationMappingName={relationMappingName}
                relations={relations}
                Body={RelationSimpleItemWrapper}
                bodyProps={{}}
                />
        }
    }

    type RelationListWrapperProps<
        GP extends GPBase,
        CName extends CollNames<GP>,
        RelName extends Extract<keyof GP["props"]["collectionsToRelations"][CName], string>,
        BodyProps
        > = {
            config: GP,
            collectionName: CName,
            relationMappingName: RelName,
            relations: InheritanceUtils.RelationQueryResult[],
            clients: BackendBase.OnlineClientSet<GP["props"]>,
            Body: React.FC<RelationItemWrapperProps<GP, any, any, BodyProps>>
            bodyProps: BodyProps
        }

    function RelationListWrapper<
        GP extends GPBase,
        CName extends CollNames<GP>,
        RelName extends Extract<keyof GP["props"]["collectionsToRelations"][CName], string>,
        BodyProps
        >(props: RelationListWrapperProps<GP, CName, RelName, BodyProps>) {

        const {config, collectionName, relationMappingName} = props
        const relToColConf = config.props.collectionsToRelations[collectionName][relationMappingName]
        const targetRelationName = relToColConf.relation as RelNames<GP>
        const targetKey = relToColConf.targetKey
        const targetRelationConfig = config.props.relations[targetRelationName]
        const targetCollectionName = targetRelationConfig.collections[targetKey]

        const Wrapper = props.Body

        return <>{props.relations.map((itemRef) => {
            return <Wrapper
                config={props.config}
                clients={props.clients}
                targetCollectionName={targetCollectionName}
                itemId={itemRef.targetId}
                payload={itemRef.payload as any}
                relationName={targetRelationName}
                bodyProps={props.bodyProps}
            />
        })}</>
    }

    export type RelationBindings<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
    > = {
        [ColToRel in keyof GP["props"]["collectionsToRelations"][CollectionName]]: XBinding.Binding<string[]>
    }

    export function createRelationsEditableInjection<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
        >(
            config: GP, 
            clients: BackendBase.OnlineClientSet<GP["props"]>, 
            collectionName: CollectionName,
            itemId: string,
            relationBindings: RelationBindings<GP, CollectionName>
        ): Utils.RelationsDisplayInjection<GP, CollectionName> {
        const result: Record<string, Utils.RelationInjectionEndpoint> = {}
        const collToRel = config.props.collectionsToRelations[collectionName]
        type ColRelName = Extract<keyof GP["props"]["collectionsToRelations"][CollectionName], string>
        for(const relName of Object.keys(collToRel) as ColRelName[]) {
            result[relName] = getRelationEndpointEditElement(config, clients, collectionName, relName, itemId, relationBindings[collectionName])
        }
        return result as Utils.RelationsDisplayInjection<GP, CollectionName>
    }

    function getRelationEndpointEditElement<
        GP extends GPBase,
        CName extends CollNames<GP>,
        RelName extends Extract<keyof GP["props"]["collectionsToRelations"][CName], string>
        >(
        config: GP, 
        clients: BackendBase.OnlineClientSet<GP["props"]>,
        collectionName: CName,
        relationMappingName: RelName,
        itemId: string,
        binding: XBinding.Binding<string[]>
    ): Utils.RelationInjectionEndpoint {
        return {
            $richListElement: () => <RelationListEditor
                config={config}
                collectionName={collectionName}
                clients={clients}
                itemId={itemId}
                relationMappingName={relationMappingName}
                binding={binding}
                Body={RelationRichItemWrapper}
                bodyProps={{}}
                />,
            $simpleListElement: () => <RelationListEditor
                config={config}
                collectionName={collectionName}
                itemId={itemId}
                clients={clients}
                relationMappingName={relationMappingName}
                binding={binding}
                Body={RelationSimpleItemWrapper}
                bodyProps={{}}
                />
        }
    }

    type RelationListEditorProps<
        GP extends GPBase,
        CName extends CollNames<GP>,
        RelName extends Extract<keyof GP["props"]["collectionsToRelations"][CName], string>,
        BodyProps
    > = {
        itemId: string,
        config: GP,
        collectionName: CName,
        relationMappingName: RelName,
        binding: XBinding.Binding<string[]>,
        clients: BackendBase.OnlineClientSet<GP["props"]>,
        Body: React.FC<RelationItemWrapperProps<GP, any, any, BodyProps>>
        bodyProps: BodyProps
    }

    function RelationListEditor<
        GP extends GPBase,
        CName extends CollNames<GP>,
        RelName extends Extract<keyof GP["props"]["collectionsToRelations"][CName], string>,
        BodyProps
    >(props: RelationListEditorProps<GP, CName, RelName, BodyProps>) {
        const {config, collectionName, relationMappingName, itemId, clients} = props
        const relToColConf = config.props.collectionsToRelations[collectionName][relationMappingName]
        const targetRelationName = relToColConf.relation as RelNames<GP>
        const targetKey = relToColConf.targetKey
        const targetRelationConfig = config.props.relations[targetRelationName]
        const targetCollectionName = targetRelationConfig.collections[targetKey]

        const Wrapper = props.Body
        const relationBinding = XBinding.fromArray(props.binding)
        const relationClients = clients.relations[targetRelationName]

        const [displaySelector, setDisplaySelector] = useState(false)
        const selectedItemBinding = XBinding.useBinding<string | null>(null)
        
        return <>
            {relationBinding.map((itemRef) => {
                return <AsyncRelationItemWrapper
                        client={relationClients}
                        relationKey={{
                            [relToColConf.selfKey]: props.itemId,
                            [relToColConf.targetKey]: itemRef.value
                        }}
                    >{payload => {
                    return <Wrapper
                        config={props.config}
                        clients={props.clients}
                        targetCollectionName={targetCollectionName}
                        itemId={itemRef.value}
                        payload={payload as any}
                        relationName={targetRelationName}
                        bodyProps={props.bodyProps}
                        onDelete={() => itemRef.remove()}
                    />
                }}</AsyncRelationItemWrapper>
            })}
            <Button
                onClick={() => setDisplaySelector(true)}
                icon={<Icons.Add/>}
            />
            <Modal
                open={displaySelector}
                title="选择项目"
                onOk={() => {
                    if(selectedItemBinding.value) {
                        const targetId = selectedItemBinding.value
                        props.binding.update([
                            ...props.binding.value,
                            targetId,
                        ])
                    }
                    setDisplaySelector(false)
                    selectedItemBinding.update(null)
                }}
                onCancel={() => {
                    setDisplaySelector(false)
                    selectedItemBinding.update(null)
                }}
            >
                <SearchResultComponents.CollectionItemSelector 
                    collectionName={props.collectionName}
                    binding={selectedItemBinding}
                />
            </Modal>
        </>
    }

    interface AsyncRelationItemWrapperProps {
        client: IOnlineClient.Relation<string, any>
        relationKey: Record<string, string>
        children: (payload: unknown) => React.ReactNode
    }
    function AsyncRelationItemWrapper(props: AsyncRelationItemWrapperProps) {
        const [result, setResult] = useState<any | null>(null)
        useEffect(() => {
            initialize()
        }, [props.relationKey])

        if(!result) {
            return <Loading/>
        } else {
            return <>{props.children(result)}</>
        }

        async function initialize() {
            const payload = await props.client.getPayload(props.relationKey)
            setResult(payload)
        }
    }

    interface RelationItemWrapperProps<
        GP extends GPBase,
        TargetCName extends CollNames<GP>,
        RelName extends RelNames<GP>,
        BodyProps
    > {
        config: GP
        targetCollectionName: TargetCName
        relationName: RelName,
        clients: BackendBase.OnlineClientSet<GP["props"]>
        itemId: string,
        bodyProps?: BodyProps,
        payload: FieldConfig.EntityFromConfig<GP["props"]["relations"][RelName]["payloadConfig"]>
        onDelete?: () => void
    }

    function RelationSimpleItemWrapper<
        GP extends GPBase,
        TargetCName extends CollNames<GP>,
        RelName extends RelNames<GP>
    > (props: RelationItemWrapperProps<GP, TargetCName, RelName, TagProps>) {
        const [item, setItem] = useState<null | FieldConfig.EntityBase>(null)
        const {config, inheritable} = props.config.props.collections[props.targetCollectionName]
        const titles = props.config.layout.titles.entityTitles[props.targetCollectionName] as DbUiConfiguration.TitlesFor<FieldConfig.EntityBase>
        const Layout = props.config.layout.layouts.entities[props.targetCollectionName].relationPreview.simple
        const {Tag} = DbContexts.useComponents()

        const collectionClient = props.clients.collections[props.targetCollectionName]
        const inheritClient = props.clients.inheritance[props.targetCollectionName]

        useEffect(() => {
            initialize()
        }, [props.targetCollectionName, props.itemId])

        if(item === null) {
            return <Tag {...props.bodyProps}>正在加载</Tag>
        } else {
            const itemProps = InjectionProps.renderStaticPropTree<FieldConfig.EntityBase>(config, item, titles)
            return <Tag {...props.bodyProps}>
                <Layout item={itemProps}/>
            </Tag>
        }
        
        async function initialize() {
            const targetItem = collectionClient ?
                    await InheritanceUtils.getEntityPatchingParents(props.itemId, config, collectionClient, inheritClient):
                    await collectionClient.getItemById(props.itemId)
            setItem(targetItem)
        }
    }

    type DivProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

    function RelationRichItemWrapper<
        GP extends GPBase,
        TargetCName extends CollNames<GP>,
        RelName extends RelNames<GP>
    > (props: RelationItemWrapperProps<GP, TargetCName, RelName, DivProps>) {
        const [item, setItem] = useState<null | FieldConfig.EntityBase>(null)
        const {config, inheritable} = props.config.props.collections[props.targetCollectionName]
        const titles = props.config.layout.titles.entityTitles[props.targetCollectionName] as DbUiConfiguration.TitlesFor<FieldConfig.EntityBase>
        const Layout = props.config.layout.layouts.entities[props.targetCollectionName].relationPreview.simple

        const collectionClient = props.clients.collections[props.targetCollectionName]
        const inheritClient = props.clients.inheritance[props.targetCollectionName]

        useEffect(() => {
            initialize()
        }, [props.targetCollectionName, props.itemId])

        // TODO: Styles
        if(item === null) {
            return <div {...props.bodyProps}>正在加载</div>
        } else {
            const itemProps = InjectionProps.renderStaticPropTree<FieldConfig.EntityBase>(config, item, titles)
            return <div {...props.bodyProps}>
                <Layout item={itemProps}/>
            </div>
        }
        
        async function initialize() {
            const targetItem = collectionClient ?
                    await InheritanceUtils.getEntityPatchingParents(props.itemId, config, collectionClient, inheritClient):
                    await collectionClient.getItemById(props.itemId)
            setItem(targetItem)
        }
    }
}