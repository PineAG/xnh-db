import { ConfigFlatten, FieldConfig, IOfflineClient } from "@xnh-db/protocol"
import { useEffect, useMemo, useState } from "react"
import { DeepPartial } from "utility-types"
import { InheritanceUtils } from "../data/inherit"
import { XBinding } from "./binding"
import { DbContexts } from "./context"
import { InjectionParentComponents, LayoutInjector } from "./inject"
import { GlobalSyncComponents, SyncFileUtils } from "./sync"
import VirtualList from 'rc-virtual-list';

export module DBPages {
    interface Props {
        collectionName: string
        itemId: string
    }

    export function View(props: Props) {
        const globalProps = DbContexts.useProps()
        const {Loading} = DbContexts.useComponents()
        const Layout = globalProps.layout.layouts.entities[props.collectionName].fullPage
        const createInjection = LayoutInjector.useCreateFullPageProps(props.collectionName)
        const [currentCollection, setCurrentCollection] = useState(props.collectionName)
    
        const [injection, setInjection] = useState<LayoutInjector.FullPageInjectionProps | null>(null)
        useEffect(() => {
            console.log("Triggered")
            setInjection(null)
            initialize()
        }, [props.collectionName, props.itemId])

        if(!injection || props.collectionName !== currentCollection) {
            return <Loading/>
        } else {
            return <Layout {...injection}/>
        }

        async function initialize() {
            const injection = await createInjection(props.itemId)
            setInjection(injection)
            setCurrentCollection(props.collectionName)
        }

    }

    type UseEditPageActions = {
        save: () => Promise<void>,
        remove: () => Promise<void>
    }

    export function useEditPage(collectionName: string, itemId: string): [JSX.Element, UseEditPageActions] {
        const {Loading} = DbContexts.useComponents()
        const globalProps = DbContexts.useProps()
        const clients = GlobalSyncComponents.useQueryClients()
        const Layout = globalProps.layout.layouts.entities[collectionName].fullPage
        
        const [pending, setPending] = useState(true)

        // fetched data
        const [entity, setEntity] = useState<DeepPartial<FieldConfig.EntityBase>>({})
        const [parent, setParent] = useState<string | null>(null)
        const emptyRelations = useEmptyRelations(collectionName)
        const [relations, setRelations] = useState(emptyRelations)
        const markCollectionDirtyFiles = SyncFileUtils.useMarkCollectionDirtyFiles(collectionName)

        // editable data
        const entityBinding = XBinding.useBinding<DeepPartial<FieldConfig.EntityBase>>({})
        const parentBinding = XBinding.useBinding<string | null>(parent)
        const newRelationsBinding = XBinding.useBinding(emptyRelations)
        const relationBindingGroup = getRelationBindingGroup(newRelationsBinding)

        const getFullPageInjection = LayoutInjector.useGetFullPagePropsFromBinding(collectionName)

        useEffect(() => {
            load()
        }, [collectionName, itemId])

        let component: JSX.Element
        if(pending) {
            component = <Loading/>
        } else {
            const injection = getFullPageInjection(itemId, entityBinding, parentBinding, relationBindingGroup)
            component = <Layout {...injection}/>
        }

        return [component, {save, remove}]

        async function load() {
            setPending(true)
            const collectionClient = clients.collections[collectionName]
            const entity = await collectionClient.getItemById(itemId)
            setEntity(entity)
            entityBinding.update(entity)

            const inheritClient = clients.inheritance[collectionName]
            if(inheritClient) {
                const parentId = await InheritanceUtils.getParentId(itemId, inheritClient)
                setParent(parentId)
                parentBinding.update(parentId)
            }

            const relations: Record<string, Record<string, string>[]> = {}
            const colToRel = globalProps.props.collectionsToRelations[collectionName]
            for(const [relRef, {relation: relationName, selfKey}] of Object.entries(colToRel)) {
                relations[relRef] = await clients.relations[relationName].getRelationsByKey(selfKey, itemId)
            }
            setRelations(relations)
            newRelationsBinding.update(relations)
            
            setPending(false)
        }

        async function save() {
            const collectionClient = clients.collections[collectionName]
            const inheritClient = clients.inheritance[collectionName]

            await collectionClient.putItem(itemId, entityBinding.value)
            await markCollectionDirtyFiles(entity, true)
            await markCollectionDirtyFiles(entityBinding.value, false)

            if(inheritClient) {
                const parents = await inheritClient.getRelationsByKey("child", itemId)
                for(const p of parents) {
                    await inheritClient.deleteRelation(p)
                }
                const parentId = parentBinding.value
                if(parentId) {
                    const isValid = await InheritanceUtils.isValidateParentId(itemId, parentId, inheritClient)
                    if(isValid) {
                        await inheritClient.putRelation({
                            parent: parentId,
                            child: itemId
                        }, {})
                    } else {
                        console.error(`Not a valid parent id of ${itemId}: ${parentId}`)
                    }
                }
                
            }

            const colToRel = globalProps.props.collectionsToRelations[collectionName]
            for(const [relRef, {relation: relationName}] of Object.entries(colToRel)) {
                const client = clients.relations[relationName]
                const newRelations = new Set<string>(newRelationsBinding.value[relRef].map(IOfflineClient.stringifyRelationKey))
                for(const rel of relations[relRef]) {
                    if(!newRelations.has(IOfflineClient.stringifyRelationKey(rel))) {
                        await client.deleteRelation(rel)
                    }
                }
            }
        }

        async function remove(){
            const client = clients.collections[collectionName]
            await client.deleteItem(itemId)
            await markCollectionDirtyFiles(entity, true)
        }
    }

    type CreatePageState = {pending: true} | {pending: false, itemId: string}
    export function useCreatePage(collectionName: string, newItemId: string): [JSX.Element, () => Promise<string>] {
        const globalProps = DbContexts.useProps()
        const entityBinding = XBinding.useBinding<DeepPartial<FieldConfig.EntityBase>>({})

        const clients = GlobalSyncComponents.useQueryClients()
        const collectionClient = clients.collections[collectionName]

        const [state, setState] = useState<CreatePageState>({pending: true})

        const {Loading} = DbContexts.useComponents()

        const Layout = globalProps.layout.layouts.entities[collectionName].newPage
        const createInjectProps = LayoutInjector.useCreateSimplePagePropsFromBinding(collectionName)
        const injection = createInjectProps(entityBinding)

        useEffect(() => {
            initialize()
        }, [collectionName, newItemId])

        let component: React.ReactNode
        if(state.pending) {
            component = <Loading/>
        } else {
            component = <Layout {...injection}/>
        }
        
        return [component, createPage]

        async function initialize() {
            // await collectionClient.putItem(newItemId, {})
            // await collectionClient.markDirtyItem(newItemId, true)
            setState({pending: false, itemId: newItemId})
        }

        async function createPage() {
            if(state.pending) {
                throw new Error("Invalid state")
            }
            await collectionClient.putItem(state.itemId, entityBinding.value)
            await collectionClient.markDirtyItem(state.itemId, false)
            return state.itemId
        }

    }

    function useEmptyRelations(collectionName: string): Record<string, Record<string, string>[]> {
        const globalProps = DbContexts.useProps()
        const emptyArrays = useMemo(() => {
            const colToRel = globalProps.props.collectionsToRelations[collectionName]
            const results: Record<string, Record<string, string>[]> = {}
            for(const [relRef, conf] of Object.entries(colToRel)) {
                results[relRef] = []
            }
            return results
        }, [collectionName])
        return emptyArrays
    }

    function getRelationBindingGroup(binding: XBinding.Binding<Record<string, Record<string, string>[]>>): LayoutInjector.RelationBindingGroup {
        const bindingGroup: Record<string, XBinding.Binding<Record<string, string>[]>> = {}
        for(const key in binding.value) {
            bindingGroup[key] = XBinding.propertyOf(binding).join(key)
        }
        return bindingGroup
    }

    type CollectionItemListProps = {
        collectionName: string
        itemHeight: number
    }
    export function CollectionItemList(props: CollectionItemListProps) {
        const clients = GlobalSyncComponents.useQueryClients()
        const client = clients.collections[props.collectionName]

        const [currentCollection, setCurrentCollection] = useState(props.collectionName)

        const globalProps = DbContexts.useProps()

        const [idList, setIdList] = useState<null | {id: string}[]>(null)
        const {Loading} = DbContexts.useComponents()
        const {useOpenItem} = globalProps.actions

        const openItem = useOpenItem(props.collectionName)

        useEffect(() => {
            loadItems()
        }, [props.collectionName])

        if(idList === null || currentCollection !== props.collectionName) {
            return <Loading/>
        } else {
            return <VirtualList data={idList} itemHeight={props.itemHeight} itemKey="id">
                {({id}) => {
                    return <InjectionParentComponents.ItemView
                        collectionName={props.collectionName}
                        itemId={id}
                        onClick={() => openItem(id)}
                    />
                }}
            </VirtualList>
        }

        async function loadItems() {
            const idList = await client.listItems()
            setIdList(idList.map(id => ({id})))
            setCurrentCollection(props.collectionName)
        }

    }
}