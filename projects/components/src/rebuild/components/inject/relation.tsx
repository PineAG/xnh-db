import { FieldConfig, IOnlineClient } from "@xnh-db/protocol"
import { useEffect, useState } from "react"
import { DbUiConfiguration, InternalGlobalLayouts } from "../../config"
import { BackendBase } from "../../data"
import { InheritanceUtils } from "../../data/inherit"
import { XBinding } from "../binding"
import { DbContexts } from "../context"
import { SearchResultComponents } from "../search"
import { GlobalSyncComponents } from "../sync"
import { InjectionProps } from "./props"
import GPBase = DbUiConfiguration.GlobalPropsBase
import Utils = DbUiConfiguration.InternalUtils.Injection

export module RelationInjectionComponents {
    export type RelationsDisplayInjection = Utils.RelationsDisplayInjection<GPBase, string>

    export function useCreateRelationsInjection(collectionName: string) {
        const globalProps = DbContexts.useProps()
        const collToRel = globalProps.props.collectionsToRelations[collectionName]

        return (itemId: string): RelationsDisplayInjection => {
            const result: Record<string, Utils.RelationInjectionEndpoint> = {}
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

        const {client, selfKey} = useRelationUtils(props.collectionName, props.colToRelName)

        const {RelationList, Loading} = DbContexts.useComponents()
        if(relations === null) {
            return <Loading/>
        }else {
            return <RelationList>
                {relations.map(id => <RelationViewItem
                    relationKey={id}
                    collectionName={props.collectionName}
                    colToRelName={props.colToRelName}
                />)}
            </RelationList>
        }

        async function initialize() {
            const keys = await client.getRelationsByKey(selfKey, props.itemId)
            setRelations(keys)
        }
    }

    type RelationViewItemProps = {relationKey: RelationKey, collectionName: string, colToRelName: string}
    function RelationViewItem(props: RelationViewItemProps) {
        const [payload, setPayload] = useState<null | FieldConfig.EntityBase>(null)
        const [collections, setCollections] = useState<null | Record<string, any>>(null)
        const globalProps = DbContexts.useProps()
        const collectionClients = GlobalSyncComponents.useQueryClients().collections
        const {RelationTag, Loading} = DbContexts.useComponents()
        const {client, selfKey, relationName, targetKey} = useRelationUtils(props.collectionName, props.colToRelName)
        const InternalTag = globalProps.layout.layouts.payloads[relationName].relationPreview

        const relationCollections = globalProps.props.relations[relationName].collections

        const comp = globalProps.layout.global.endpoint.viewers
        const payloadConfig = globalProps.props.relations[relationName].payloadConfig
        const payloadTitles = globalProps.layout.titles.payloadTitles[relationName]

        useEffect(() => {
            initialize()
        }, [props.relationKey, props.colToRelName, props.collectionName])

        if(payload === null || collections === null) {
            return <Loading/>
        } else {
            const payloadProps = InjectionProps.renderStaticPropTree(comp, payloadConfig, payload, payloadTitles)
            return <RelationTag>
                <InternalTag
                    selfKey={selfKey as any}
                    targetKey={targetKey as any}
                    payload={payloadProps}
                    collections={collections}
                />
            </RelationTag>
        }

        async function initialize(){
            const payload = await client.getPayload(props.relationKey)
            const collections: Record<string, FieldConfig.EntityBase> = {}
            for(const name in relationCollections) {
                const colName = relationCollections[name]
                const colClient = collectionClients[colName]
                const colId = props.relationKey[name]
                collections[name] = await colClient.getItemById(colId)
            }
            setPayload(payload)
            setCollections(collections)
        }
    }

    function useRelationUtils(collectionName: string, colToRelName: string) {
        const globalProps = DbContexts.useProps()
        const clients = GlobalSyncComponents.useQueryClients()
        const {relation, selfKey, targetKey} = globalProps.props.collectionsToRelations[collectionName][colToRelName]
        return {
            client: clients.relations[relation],
            relationName: relation,
            selfKey, targetKey
        }
    }
    
    type RelationBindings = Record<string, XBinding.Binding<string[]>>

    export function useCreateRelationsEditableInjection(collectionName: string) {
        const globalProps = DbContexts.useProps()
        const collToRel = globalProps.props.collectionsToRelations[collectionName]

        
        return (itemId: string, relationBindings: RelationBindings): RelationsDisplayInjection => {
            const result: Record<string, Utils.RelationInjectionEndpoint> = {}
            for(const relName of Object.keys(collToRel)) {
                result[relName] = {
                    $element: () => <></>
                }
            }
            return result as RelationsDisplayInjection
        }
    }

    type RelationEditorListProps = {itemId: string, binding: RelationBindings}
    function RelationEditorList() {
        TODO
    }

    function RelationEditorItem() {
        
    }
}