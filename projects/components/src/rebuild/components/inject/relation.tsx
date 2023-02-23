import { FieldConfig, IOfflineClient, IOnlineClient } from "@xnh-db/protocol"
import { useEffect, useState } from "react"
import { DbUiConfiguration, InternalGlobalLayouts } from "../../config"
import { BackendBase } from "../../data"
import { InheritanceUtils } from "../../data/inherit"
import { XBinding } from "../binding"
import { DbContexts } from "../context"
import { SearchResultComponents } from "../search"
import { GlobalSyncComponents } from "../sync"
import { InternalEntityEditors } from "./editor"
import { InjectionProps } from "./props"
import { useRelationUtils } from "./utils"
import GPBase = DbUiConfiguration.GlobalPropsBase
import Utils = DbUiConfiguration.InternalUtils

export module RelationInjectionComponents {
    export type RelationsDisplayInjection = Utils.Injection.RelationsDisplayInjection<GPBase, string>

    export function useCreateRelationsInjection(collectionName: string) {
        const globalProps = DbContexts.useProps()
        const collToRel = globalProps.props.collectionsToRelations[collectionName]

        return (itemId: string): RelationsDisplayInjection => {
            const result: Record<string, Utils.Injection.RelationInjectionEndpoint> = {}
            for(const relName of Object.keys(collToRel)) {
                result[relName] = {
                    $element: () => <RelationViewList
                        itemId={itemId}
                        collectionName={collectionName}
                        colToRelName={relName}
                    />
                }
            }
            return result as RelationsDisplayInjection
        }
    }

    type RelationKey = Record<string, string>
    type RelationViewListProps = {itemId: string, collectionName: string, colToRelName: string}
    function RelationViewList(props: RelationViewListProps) {
        const [relations, setRelations] = useState<RelationKey[] | null>(null)
        useEffect(() => {
            initialize()
        }, [props.itemId, props.colToRelName])

        const globalProps = DbContexts.useProps()
        const {client, selfKey, targetKey, relationName, targetCollection} = useRelationUtils(props.collectionName, props.colToRelName)
        const openItem = globalProps.actions.useOpenItem(targetCollection)

        const {RelationList, Loading, RelationTag} = DbContexts.useComponents()
        const clients = GlobalSyncComponents.useQueryClients()

        if(relations === null) {
            return <Loading/>
        }else {
            return <RelationList>
                {relations.map(id => <RelationTag 
                    key={IOfflineClient.stringifyRelationKey(id)}
                    onClick={() => openItem(id[targetKey])}>
                    <RelationViewItem
                        relationKey={id}
                        collectionName={props.collectionName}
                        colToRelName={props.colToRelName}
                    />
                </RelationTag>
                )}
            </RelationList>
        }

        async function initialize() {
            const result: Record<string, Record<string, string>> = {}
            const targets: string[] = [props.itemId]
            const inheritClient = clients.inheritance[props.collectionName]
            if(inheritClient) {
                const parents = await InheritanceUtils.getParents(props.itemId, inheritClient)
                targets.push(...parents)
            }
            for(const id of targets) {
                const keys = await client.getRelationsByKey(selfKey, id)
                for(const key of keys) {
                    result[IOfflineClient.stringifyRelationKey(key)] = key
                }
            }
            setRelations(Object.values(result))
        }
    }

    type RelationViewItemProps = {relationKey: RelationKey, collectionName: string, colToRelName: string}
    function RelationViewItem(props: RelationViewItemProps) {
        const globalProps = DbContexts.useProps()
        const {Loading} = DbContexts.useComponents()
        const {selfKey, relationName, targetKey} = useRelationUtils(props.collectionName, props.colToRelName)
        const InternalTag = globalProps.layout.layouts.payloads[relationName].relationPreview

        const relationData = useRelationData(props.relationKey, props.collectionName, props.colToRelName)

        const comp = globalProps.layout.global.endpoint.viewers
        const payloadConfig = globalProps.props.relations[relationName].payloadConfig
        const payloadTitles = globalProps.layout.titles.payloadTitles[relationName]

        if(relationData === null) {
            return <Loading/>
        } else {
            const payloadProps = InjectionProps.renderStaticPropTree(payloadConfig, relationData.payload, payloadTitles, {
                components: comp,
                openItem: () => {},
                openSearch: () => {}
            })
            const collections: Record<string, any> = {}
            for(const [key, data] of Object.entries(relationData.collections)) {
                const colName =globalProps.props.relations[relationName].collections[key]
                const titles = globalProps.layout.titles.entityTitles[colName]
                const conf = globalProps.props.collections[colName].config
                collections[key] = InjectionProps.renderStaticPropTree(conf, data, titles, {
                    components: comp,
                    openItem: () => {},
                    openSearch: () => {}
                })
            }

            return <InternalTag
                    selfKey={selfKey as any}
                    targetKey={targetKey as any}
                    payload={payloadProps}
                    collections={collections}
                />
        }
    }

    function useRelationData(relationKey: RelationKey, collectionName: string, colToRelName: string) {
        const globalProps = DbContexts.useProps()
        const [payload, setPayload] = useState<null | FieldConfig.EntityBase>(null)
        const [collections, setCollections] = useState<null | Record<string, any>>(null)
        const {client, selfKey, relationName, targetKey} = useRelationUtils(collectionName, colToRelName)
        const relationCollections = globalProps.props.relations[relationName].collections
        const collectionClients = GlobalSyncComponents.useQueryClients().collections

        useEffect(() => {
            initialize()
        }, [relationKey, colToRelName, collectionName])

        if(payload === null || collections === null) {
            return null
        } else {
            return {payload, collections}
        }

        async function initialize(){
            const payload = await client.getPayload(relationKey)
            const collections: Record<string, FieldConfig.EntityBase> = {}
            for(const name in relationCollections) {
                const colName = relationCollections[name]
                const colClient = collectionClients[colName]
                const colId = relationKey[name]
                collections[name] = await colClient.getItemById(colId)
            }
            setPayload(payload)
            setCollections(collections)
        }
    }
    
    type RelationBindings = Record<string, XBinding.Binding<RelationKey[]>>

    export function useCreateRelationsEditableInjection(collectionName: string) {
        const globalProps = DbContexts.useProps()
        const collToRel = globalProps.props.collectionsToRelations[collectionName]

        return (itemId: string, relationBindings: RelationBindings): RelationsDisplayInjection => {
            const result: Record<string, Utils.Injection.RelationInjectionEndpoint> = {}
            for(const relName of Object.keys(collToRel)) {
                result[relName] = {
                    $element: () => <RelationEditorList
                        collectionName={collectionName}
                        colToRelName={relName}
                        itemId={itemId}
                        binding={relationBindings[relName]}
                    />
                }
            }
            return result as RelationsDisplayInjection
        }
    }

    type RelationEditorListProps = {itemId: string, binding: XBinding.Binding<RelationKey[]>, collectionName: string, colToRelName: string}
    function RelationEditorList(props: RelationEditorListProps) {
        const [showCreateDialog, setShowCreateDialog] = useState(false)
        const bindingItems = XBinding.fromArray(props.binding)
        const {selfKey, relationName, client} = useRelationUtils(props.collectionName, props.colToRelName)
        const isValidKey = useIsValidKey(relationName)

        const {RelationList, AddRelationButton} = DbContexts.useComponents()
        return <RelationList>
            {bindingItems.map(item => (
                <RelationEditorItem 
                    key={IOfflineClient.stringifyRelationKey(item.value)}
                    itemId={props.itemId}
                    relationKey={item}
                    collectionName={props.collectionName}
                    colToRelName={props.colToRelName}
                    onRemove={() => item.remove()}
                />
            ))}
            <AddRelationButton onClick={createRelation}/>
            <InternalEntityEditors.RelationEditDialog
                open={showCreateDialog}
                fixedKeys={{[selfKey]: props.itemId}}
                initialPayload={{}}
                initialKeys={{}}
                relationName={relationName}
                onCancel={() => {
                    setShowCreateDialog(false)

                }}
                onOk={onRelationCreate}
            />
        </RelationList>

        function createRelation() {
            setShowCreateDialog(true)
        }

        async function onRelationCreate(payload: FieldConfig.EntityBase, keys: RelationKey) {
            if(!isValidKey(keys)) {
                throw new Error(`Invalid relation: ${JSON.stringify(keys)}`)
            }
            await client.putRelation(keys, payload)
            props.binding.update([
                ...props.binding.value,
                keys
            ])
            setShowCreateDialog(false)
        }
    }

    function useIsValidKey(relationName: string) {
        const globalProps = DbContexts.useProps()
        const collections = globalProps.props.relations[relationName].collections
        return (keys: Record<string, string>) => {
            for(const key in collections) {
                if(!keys[key]) {
                    return false
                }
            }
            return true
        }
    }

    type RelationEditorItemProps = {itemId: string, relationKey: XBinding.Binding<RelationKey>, collectionName: string, colToRelName: string, onRemove: () => void}
    function RelationEditorItem(props: RelationEditorItemProps) {
        const {selfKey, targetKey, relationName, client} = useRelationUtils(props.collectionName, props.colToRelName)
        const globalProps = DbContexts.useProps()
        const relationData = useRelationData(props.relationKey.value, props.collectionName, props.colToRelName)
        const InternalTag = globalProps.layout.layouts.payloads[relationName].relationPreview
        const {Loading} = DbContexts.useComponents()
        const comp = globalProps.layout.global.endpoint.viewers
        const payloadConfig = globalProps.props.relations[relationName].payloadConfig
        const payloadTitles = globalProps.layout.titles.payloadTitles[relationName]
        const [showDialog, setShowDialog] = useState(false)
        
        const {RelationTag} = DbContexts.useComponents()

        if(relationData === null) {
            return <Loading/>
        } else {
            const payloadProps = InjectionProps.renderStaticPropTree(payloadConfig, relationData.payload, payloadTitles, {
                components: comp,
                openItem: () => {},
                openSearch: () => {}
            })
            const collections: Record<string, any> = {}
            for(const [key, data] of Object.entries(relationData.collections)) {
                const colName =globalProps.props.relations[relationName].collections[key]
                const titles = globalProps.layout.titles.entityTitles[colName]
                const conf = globalProps.props.collections[colName].config
                collections[key] = InjectionProps.renderStaticPropTree(conf, data, titles, {
                    components: comp,
                    openItem: () => {},
                    openSearch: () => {}
                })
            }

            return <>
                <RelationTag onClick={() => setShowDialog(true)} onClose={props.onRemove}>
                    <InternalTag
                        selfKey={selfKey as any}
                        targetKey={targetKey as any}
                        collections={collections}
                        payload={payloadProps}
                    />
                </RelationTag>
                <InternalEntityEditors.RelationEditDialog
                    open={showDialog}
                    fixedKeys={{[selfKey]: props.itemId}}
                    relationName={relationName}
                    initialKeys={props.relationKey.value}
                    initialPayload={relationData.payload}
                    onCancel={() => {
                        setShowDialog(false)
                    }}
                    onOk={async (payload, keys) => {
                        await client.putRelation(keys, payload)
                        props.relationKey.update(keys)
                        setShowDialog(false)
                    }}
                />
            </>
        }
    }
}