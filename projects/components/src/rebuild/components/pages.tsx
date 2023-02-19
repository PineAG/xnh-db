import { ConfigFlatten, FieldConfig, IOfflineClient } from "@xnh-db/protocol"
import { useEffect, useMemo, useState } from "react"
import { DeepPartial } from "utility-types"
import { InheritanceUtils } from "../data/inherit"
import { XBinding } from "./binding"
import { DbContexts } from "./context"
import { LayoutInjector } from "./inject"
import { GlobalSyncComponents } from "./sync"

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
    
        const [injection, setInjection] = useState<LayoutInjector.FullPageInjectionProps | null>(null)
        useEffect(() => {
            initialize()
        }, [props.collectionName, props.itemId])

        if(!injection) {
            return <Loading/>
        } else {
            return <Layout {...injection}/>
        }

        async function initialize() {
            const injection = await createInjection(props.itemId)
            setInjection(injection)
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
        const [relations, setRelations] = useState(useEmptyRelations(collectionName))

        // editable data
        const entityBinding = XBinding.useBinding(entity)
        const parentBinding = XBinding.useBinding<string | null>(parent)
        const relationBinding = useRelationBindingGroup(relations)

        const getFullPageInjection = LayoutInjector.useGetFullPagePropsFromBinding(collectionName)

        useEffect(() => {
            load()
        }, [collectionName, itemId])

        let component: JSX.Element
        if(pending) {
            component = <Loading/>
        } else {
            const injection = getFullPageInjection(itemId, entityBinding, parentBinding, relationBinding)
            component = <Layout {...injection}/>
        }

        return [component, {save, remove}]

        async function load() {
            setPending(true)
            const collectionClient = clients.collections[collectionName]
            const entity = await collectionClient.getItemById(itemId)
            setEntity(entity)

            const inheritClient = clients.inheritance[collectionName]
            if(inheritClient) {
                const parentId = await InheritanceUtils.getParentId(itemId, inheritClient)
                setParent(parentId)
            }

            const relations: Record<string, Record<string, string>[]> = {}
            const colToRel = globalProps.props.collectionsToRelations[collectionName]
            for(const [relRef, {relation: relationName, selfKey}] of Object.entries(colToRel)) {
                relations[relRef] = await clients.relations[relationName].getRelationsByKey(selfKey, itemId)
            }
            setRelations(relations)
            
            setPending(false)
        }

        async function save() {
            const collectionClient = clients.collections[collectionName]
            const inheritClient = clients.inheritance[collectionName]

            await collectionClient.putItem(itemId, entity.value)
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
                const newRelations = new Set<string>(relationBinding[relRef].value.map(IOfflineClient.stringifyRelationKey))
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
        }
    }

    export function useCreatePage(collectionName: string): [JSX.Element, () => Promise<string>] {
        const globalProps = DbContexts.useProps()
        const entityBinding = XBinding.useBinding<DeepPartial<FieldConfig.EntityBase>>({})

        const clients = GlobalSyncComponents.useQueryClients()

        const Layout = globalProps.layout.layouts.entities[collectionName].newPage
        const createInjectProps = LayoutInjector.useCreateSimplePagePropsFromBinding(collectionName)
        const injection = createInjectProps(entityBinding)

        const component = <Layout {...injection}/>
        return [component, createPage]

        async function createPage() {
            const itemId = crypto.randomUUID()
            await clients.collections[collectionName].putItem(itemId, entityBinding.value)
            return itemId
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

    function useRelationBindingGroup(emptyArrays: Record<string, Record<string, string>[]>): LayoutInjector.RelationBindingGroup {
        const binding = XBinding.useBinding(emptyArrays)
        const bindingGroup: Record<string, XBinding.Binding<Record<string, string>[]>> = {}
        for(const key in binding) {
            bindingGroup[key] = XBinding.propertyOf(binding).join(key)
        }
        return bindingGroup
    }
}