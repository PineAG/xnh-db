import { arrayBinding, createNullableContext, Flex, IconButton, Icons, Loading, propertyBinding, StringField, useLocalDBinding, useNullableContext } from "@pltk/components";
import { IOnlineClientSet } from "@xnh-db/protocol";
import {Button, Input as AntInput} from "antd";
import * as AntdIcons from "@ant-design/icons"
import { createContext, useContext, useEffect, useState } from "react";
import { DeepPartial } from "utility-types";
import { DBSearch } from "../search";
import { IdbCollectionQuery } from "../storage";
import { useDBClients, XBinding } from "./sync";

type CollectionName = keyof IOnlineClientSet<IdbCollectionQuery>["collections"]
type CollectionType<N extends CollectionName> = Awaited<ReturnType<IOnlineClientSet<IdbCollectionQuery>["collections"][N]["getItemById"]>>

type DBSearchState<C extends CollectionName> = {
    query: DBSearch.IQuery
    search(query: DBSearch.IQuery): Promise<void>
    getItem(id: string): Promise<DeepPartial<CollectionType<C>>>
    result: {
        state: "pending"
    } | {
        state: "success"
        items: string[]
    }
}

type StateSet = {[C in CollectionName]: DBSearchState<C>}
const StateContext = createContext<Partial<StateSet>>({})
const InheritanceContext = createContext<Partial<Record<CollectionName, DBSearch.IQuery>>>({})

export function useDBSearch<C extends CollectionName>(collectionName: C): DBSearchState<C> {
    const ctx = useContext(StateContext)
    const result: DBSearchState<C> = ctx[collectionName]
    if(!result) {
        throw new Error(`DBSearchContextProvider for ${collectionName} is not initialized`)
    }
    return result
}

export interface DBSearchContextProviderProps<C extends CollectionName> {
    collection: C
    initialQuery?: DBSearch.IQuery
    inherit?: boolean
    children: React.ReactNode
    onSearch?: (query: DBSearch.IQuery) => Promise<void>
}

export function DBSearchContextProvider<C extends CollectionName>(props: DBSearchContextProviderProps<C>) {
    const inheritedQuery = useContext(InheritanceContext)
    const inheritedResults = useContext(StateContext)
    const queryBinding = XBinding.useBinding({fullText: [], property: []})
    const [pending, setPending] = useState(false)
    const [items, setItems] = useState<string[]>([])
    const clients = useDBClients()

    useEffect(() => {
        const parentQuery = inheritedQuery[props.collection]
        if(props.inherit && parentQuery && props.initialQuery) {
            queryBinding.update(DBSearch.mergeQuery(parentQuery, props.initialQuery))
        } else if (props.inherit && parentQuery) {
            queryBinding.update(parentQuery)
        } else if(props.initialQuery) {
            queryBinding.update(props.initialQuery)
        }

    }, [props.initialQuery, props.inherit, inheritedQuery[props.collection]])

    const nextQuery = {...inheritedQuery, [props.collection]: queryBinding.value}

    const state: DBSearchState<C> = {
        query: queryBinding.value,
        search,
        getItem,
        result: pending ? ({
            state: "pending"
        }): ({
            state: "success",
            items
        })
    }

    const allStates: Partial<StateSet> = {
        ...inheritedResults,
        [props.collection]: state
    }

    return <StateContext.Provider value={allStates}>
        <InheritanceContext.Provider value={nextQuery}>
            {props.children}
        </InheritanceContext.Provider>
    </StateContext.Provider>

    async function search(query: DBSearch.IQuery) {
        queryBinding.update(query)
        if(props.onSearch) {
            props.onSearch(query)   
        }
        setPending(true)
        const c = clients.query.collections[props.collection]
        const results = await DBSearch.search(query, c)
        setItems(results.map(it => it.id))
        setPending(false)
    }

    async function getItem(id: string): Promise<DeepPartial<CollectionType<C>>> {
        const c = clients.query.collections[props.collection]
        return await c.getItemById(id) as DeepPartial<CollectionType<C>>
    }

}

type CollectionProps<C extends CollectionName> = {collection: C}

export function DBSearchInput<C extends CollectionName>({collection}: CollectionProps<C>) {
    const search = useDBSearch(collection)

    const [searchText, setSearchText] = useState("")
    const tagList = arrayBinding(useLocalDBinding<{keyPath: string, value: string}[]>([]))

    useEffect(() => {
        tagList.update(search.query.property.map(it => ({keyPath: it.keyPath.join("."), value: it.value})))
    }, [search.query.property])

    return <Flex direction="vertical" spacing={16}>
        <Flex direction="horizontal" nowrap spacing={8}>
            <AntInput value={searchText} onChange={evt => {setSearchText(evt.target.value)}}/>
            <Button icon={<AntdIcons.SearchOutlined/>} onClick={onSearch} type="primary">搜索</Button>
        </Flex>
        <Flex direction="vertical" spacing={8}>
            {tagList.items.map((item, i) => {
                return <Flex direction="horizontal" key={i} spacing={8} nowrap>
                    <StringField binding={propertyBinding(item, "keyPath")}/>:
                    <StringField binding={propertyBinding(item, "value")}/>
                    <IconButton icon={<Icons.Delete/>} onClick={() => item.remove()}/>
                </Flex>
            })}
            <Button icon={<Icons.Add/>} onClick={() => tagList.append({keyPath: "", value: ""})}>添加</Button>
        </Flex>
    </Flex>

    async function onSearch(){
        const keywords = searchText.split(/\s+/).filter(it => it.length > 0)
        await search.search({
            fullText: keywords,
            property: tagList.value.map(it => ({keyPath: it.keyPath.split("."), value: it.value}))
        })
    }
}

export function DBSearchResultList<C extends CollectionName>({collection}: CollectionProps<C>) {
    const search = useDBSearch(collection)
    if(search.result.state === "pending") {
        return <Loading/>
    } else {
        return <ul>
            {search.result.items.map(id => (
                <li key={id}><DBSearchResultConsumer collection={collection} id={id}>
                    {(item) => (item.title)}
                </DBSearchResultConsumer>
                </li>))}
        </ul>
    }
}

interface DBSearchResultConsumerProps<C extends CollectionName> {
    collection: C
    id: string
    children: (item: CollectionType<CollectionName>) => React.ReactNode
    loadingElement?: React.ReactNode
}

export function DBSearchResultConsumer<C extends CollectionName>(props: DBSearchResultConsumerProps<C>): JSX.Element {
    const search = useDBSearch(props.collection)
    const [value, setValue] = useState<null | CollectionType<C>>(null)

    useEffect(() => {
        search.getItem(props.id).then(item => {
            setValue(item as CollectionType<C>)
        })
    }, [props.collection, props.id])

    if(!value) {
        return <>
            {props.loadingElement ?? <Loading/>}
        </>
    } else {
        return <>
            {props.children(value)}
        </>
    }

}
