import * as AntdIcons from "@ant-design/icons";
import { Collapse, createNullableContext, Flex, FormItem, HStack, Loading } from "@pltk/components";
import { DBDeclaration, DBDefinitions, FieldConfig, flattenDataDefinition, ICharacter } from "@xnh-db/protocol";
import { Button, Card, Input as AntInput, Tag, TreeDataNode, TreeSelect, Select, AutoComplete } from "antd";
import { DefaultOptionType } from "antd/es/select";
import { DataNode } from "antd/es/tree";
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { DeepPartial } from "utility-types";
import { DBSearch } from "../search";
import { Titles } from "../titles";
import { useDBClients, XBinding } from "./sync";
import { entitySearchResultViews } from "./view";

type CollectionName = keyof DBDeclaration
type CollectionType<N extends CollectionName> = DBDeclaration[N]

type DBSearchState<C extends CollectionName> = {
    query: IQuery
    search(query: IQuery): Promise<void>
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
const InheritanceContext = createContext<Partial<Record<CollectionName, IQuery>>>({})

type IQuery = {type: "merge", operator: "and", children: (DBSearch.IQueryDef["fullText"] | DBSearch.IQueryDef["property"])[]}

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
    initialQuery?: IQuery
    inherit?: boolean
    children: React.ReactNode
    onSearch?: (query: IQuery) => Promise<void>
}

export function DBSearchContextProvider<C extends CollectionName>(props: DBSearchContextProviderProps<C>) {
    const inheritedQuery = useContext(InheritanceContext)
    const inheritedResults = useContext(StateContext)
    const queryBinding = XBinding.useBinding<IQuery>({type: "merge", operator: "and", children: []})
    const [pending, setPending] = useState(false)
    const [items, setItems] = useState<string[]>([])
    const clients = useDBClients()

    useEffect(() => {
        const parentQuery = inheritedQuery[props.collection]
        if(props.inherit && parentQuery && props.initialQuery) {
            queryBinding.update({type: "merge", operator: "and", children: [
                ...parentQuery.children,
                ...props.initialQuery.children
            ]})
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

    async function search(query: IQuery) {
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
    const [propertyPath, setPropertyPath] = useState<string>("")
    const [propertyTags, setPropertyTags] = useState<string[]>([])
    const [selectedTag, setSelectedTag] = useState("")
    const [autoCompleteResults, setAutoCompleteResults] = useState<string[]>([])
    const [flatTitles, flatPath, flatConfig, propertyTree] = useMemo(() => {
        return getConfigInfo()
    }, [collection])

    const clients = useDBClients()

    return <Card>
        <Flex direction="vertical" spacing={8}>
            <Flex direction="horizontal" spacing={8}>
                {search.query.children.map((q, i) => (
                    <Tag
                        key={i}
                        style={{fontSize: "1rem"}}
                        closable
                        onClose={(evt) => {
                            evt.preventDefault()
                            deleteIthQuery(i)
                        }}
                    >{
                        q.type === "fullText" ? 
                            q.keyword :
                            `${flatTitles[Titles.stringifyPath(q.property.keyPath)]}: ${q.property.value}`
                    }</Tag>
                ))}
            </Flex>
            <HStack layout={["1fr", "1fr"]} spacing={24}>
                <FormItem label="关键字">
                    <HStack layout={["1fr", "auto"]} spacing={8}>
                        <AutoComplete
                            value={searchText}
                            onChange={setSearchText}
                            onSearch={triggerAutoComplete}
                            options={autoCompleteResults.map(it => ({value: it}))}
                        />
                        {/* <AntInput value={searchText} onChange={evt => {setSearchText(evt.target.value)}}/> */}
                        <Button icon={<AntdIcons.PlusOutlined/>} onClick={searchFullText} type="primary">搜索关键字</Button>
                    </HStack>
                </FormItem>
                <FormItem label="属性">
                    <HStack layout={["1fr", "1fr", "auto"]} spacing={8}>
                        <TreeSelect
                            treeDefaultExpandAll
                            value={propertyPath}
                            onChange={value => {
                                setPropertyPath(value)
                                loadTags(value)
                            }}
                            treeData={propertyTree}/>
                        <Select
                            value={selectedTag}
                            onChange={setSelectedTag}
                            disabled={!propertyPath || flatConfig[propertyPath] === undefined}
                            options={propertyTags.map(it => ({
                                label: it,
                                value: it
                            }))}
                        />
                        <Button icon={<AntdIcons.PlusOutlined/>} disabled={!selectedTag} onClick={searchProperty} type="primary">搜索属性</Button>
                    </HStack>
                </FormItem>
            </HStack>
        </Flex>
    </Card>

    async function triggerAutoComplete(keywords: string) {
        const results = await clients.query.collections[collection].autocompleteFullText(keywords, 20)
        console.log(results)
        setAutoCompleteResults(results)
    }

    async function deleteIthQuery(i: number) {
        const newList = Array.from(search.query.children)
        newList.splice(i, 1)
        await search.search({
            type: "merge",
            operator: "and",
            children: newList
        })
    }

    async function searchFullText(){
        const keywords = searchText.split(/\s+/).filter(it => it.length > 0)
        const newQuery: IQuery = {
            type: "merge",
            operator: "and",
            children: [
                ...search.query.children,
                ...keywords.map(keyword => ({
                    type: "fullText",
                    keyword 
                } as DBSearch.IQueryDef["fullText"]))
            ]
        }
        await search.search(newQuery)
        setSearchText("")
    }

    async function searchProperty() {
        if(!selectedTag || !propertyPath) return;
        const newQuery: IQuery = {
            type: "merge",
            operator: "and",
            children: [
                ...search.query.children,
                {
                    type: "property",
                    property: {
                        keyPath: flatPath[propertyPath],
                        value: selectedTag
                    }
                }
            ]
        }
        await search.search(newQuery)
    }

    async function loadTags(propertyPath: string) {
        setPropertyTags([])
        setSelectedTag("")
        const conf = flatConfig[propertyPath]
        if(!FieldConfig.isFieldConfig(conf) || conf.type !== "string") {
            return
        }
        if(conf.options.type !== "tag") {
            return
        }
        const tags = await clients.query.tags.getTagsByCollection(conf.options.collection)
        setPropertyTags(tags)
    }

    function getConfigInfo(): [Record<string, string>, Record<string, string[]>, Record<string, FieldConfig.FieldConfig>, DefaultOptionType[]] {
        const titles = Titles.titles[collection]
        const config = DBDefinitions[collection]
        const flatTitles = Titles.flattenTitlesByConfig<CollectionType<C>>(titles, config)
        const flatConfList = flattenDataDefinition(config)
        const flatPath = Object.fromEntries(flatConfList.map(([it, _]) => [Titles.stringifyPath(it), it]))
        const flatConf = Object.fromEntries(flatConfList.map(([keyPath, conf]) => [Titles.stringifyPath(keyPath), conf]))
        const propertyTree = walk([], config)
        const properties = (propertyTree?.children ?? []) as DefaultOptionType[]
        return [flatTitles, flatPath, flatConf, properties]

        function walk(path: string[], config: any): DefaultOptionType | undefined {
            const pathStr = Titles.stringifyPath(path)
            if(FieldConfig.isFieldConfig(config)) {
                if(config.type === "string" && config.options.type === "tag") {
                    return {
                        label: flatTitles[pathStr],
                        value: pathStr
                    }
                } else {
                    return undefined
                }
            } else {
                const children: DefaultOptionType[] = []
                for(const k in config) {
                    const res = walk([...path, k], config[k])
                    if(res) {
                        children.push(res)
                    }
                }
                if(children.length === 0) {
                    return undefined
                }
                return {
                    label: flatTitles[pathStr],
                    value: flatTitles[pathStr],
                    children
                }
            }
        }
    }
}

export function DBSearchResultList<C extends CollectionName>({collection}: CollectionProps<C>) {
    const search = useDBSearch(collection)
    const Item: React.FC<{id: string}> = entitySearchResultViews[collection]
    if(search.result.state === "pending") {
        return <Loading/>
    } else {
        return <Flex>
            {search.result.items.map(id => (
                <Item key={id} id={id}/>
            ))}
        </Flex>
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

type SearchItemOnClickCallback = (collection: CollectionName, id: string) => void
const SearchItemOpenerContext = createContext<null | SearchItemOnClickCallback>(null)

export function SearchItemOpenerProvider(props: {onOpen: SearchItemOnClickCallback, children: React.ReactNode}) {
    return <SearchItemOpenerContext.Provider value={props.onOpen}>
        {props.children}
    </SearchItemOpenerContext.Provider>
} 

export function useSearchItemOpener(): SearchItemOnClickCallback | null {
    return useContext(SearchItemOpenerContext)
}