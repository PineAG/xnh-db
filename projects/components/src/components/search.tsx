import * as AntdIcons from "@ant-design/icons";
import { Collapse, Flex, FormItem, Loading } from "@pltk/components";
import { DBDeclaration, DBDefinitions, FieldConfig } from "@xnh-db/protocol";
import { Button, Input as AntInput, Select, Tree } from "antd";
import { DataNode } from "antd/es/tree";
import { createContext, useContext, useEffect, useState } from "react";
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
    const treeBinding = XBinding.useBinding<PropertyQuery.TreeNode | null>(null)

    useEffect(() => {
        const fullTextQuery: string[] = []
        const propertyQuery: DBSearch.IQueryDef["property"][] = []
        for(const q of search.query.children) {
            if(q.type === "fullText") {
                fullTextQuery.push(q.keyword)
            } else {
                propertyQuery.push(q)
            }
        }
        setSearchText(fullTextQuery.join(" "))
        treeBinding.update(PropertyQuery.propertiesToTree(collection, propertyQuery))
    }, [search.query])

    return <Flex direction="vertical" spacing={16}>
        <Flex direction="horizontal" nowrap spacing={8}>
            <AntInput value={searchText} onChange={evt => {setSearchText(evt.target.value)}}/>
            <Button icon={<AntdIcons.SearchOutlined/>} onClick={onSearch} type="primary">搜索</Button>
        </Flex>
        <Collapse title="选择属性">
            <Tree
                blockNode
                defaultExpandAll
                treeData={PropertyQuery.renderTree(treeBinding)}/>
        </Collapse>
    </Flex>

    async function onSearch(){
        const keywords = searchText.split(/\s+/).filter(it => it.length > 0)
        const newQuery: IQuery = {
            type: "merge",
            operator: "and",
            children: [
                ...keywords.map(keyword => ({type: "fullText" as const, keyword})),
                ...PropertyQuery.treeToProperties(treeBinding.value)
            ]
        }
        await search.search(newQuery)
    }
}

module PropertyQuery {
    type ParentNode = {
        keyPath: string[]
        title: string
        children: TreeNode[]
    }
    type LeafNode = {
        keyPath: string[]
        title: string
        collection: string
        value: string | undefined
    }

    export type TreeNode = LeafNode | ParentNode

    export function renderTree(tree: XBinding.Binding<TreeNode | null>): DataNode[] {
        if(tree.value === null) {
            return []
        }
        const [node, _] = walk(tree)
        return node.children
        function walk(node: XBinding.Binding<TreeNode>): [DataNode, number] {
            if("children" in node.value) {
                let count = 0
                const childrenBinding = XBinding.propertyOf(node as XBinding.Binding<ParentNode>).join("children")
                const children = XBinding.fromArray(childrenBinding).map((n) => {
                    const [nd, c] = walk(n)
                    count += c
                    return nd
                })
                return [{
                    title: `${node.value.title} [${count}]`,
                    key: node.value.keyPath.join("."),
                    isLeaf: false,
                    children
                }, count]
            } else {
                return [{
                    title: <TreeLeafComp binding={node as XBinding.Binding<LeafNode>}/>,
                    key: node.value.keyPath.join("."),
                    isLeaf: true
                }, node.value.value === undefined ? 0 : 1]
            }
        }
    }

    type TreeLeafCompProps = {binding: XBinding.Binding<LeafNode>}
    function TreeLeafComp(props: TreeLeafCompProps): JSX.Element {
        const clients = useDBClients()
        const [options, setOptions] = useState<string[]>([])
        const valueBinding = XBinding.propertyOf(props.binding).join("value")
        useEffect(() => {
            clients.query.tags.getTagsByCollection(props.binding.value.collection).then(collections => {
                collections.sort()
                setOptions(collections)
            })
        }, [props.binding.value.collection])
        return <FormItem label={props.binding.value.title}>
            <Select<string>
                showSearch
                allowClear
                value={valueBinding.value}
                onClear={() => valueBinding.update(undefined)}
                onSelect={value => {
                    if(!value) {
                        valueBinding.update(undefined)
                    } else {
                        valueBinding.update(value)
                    }
                }}
                options={options.map(op => ({
                    label: op,
                    value: op
                }))}
            />
        </FormItem>
    }

    export function propertiesToTree<C extends CollectionName>(collection: C, properties: DBSearch.IQueryDef["property"][]): TreeNode {
        const partialData = convertListToTree(properties)
        const tree = walk([], partialData, Titles.titles[collection], DBDefinitions[collection])
        if(!tree) {
            throw new Error("Invalid state")
        }
        return tree

        function walk(keyPath: string[], data: any, titles: any, config: any): TreeNode | undefined {
            if(FieldConfig.isFieldConfig(config)) {
                if(config.type === "string" && config.options.type === "tag") {
                    return {
                        keyPath,
                        title: titles,
                        collection: config.options.collection,
                        value: data
                    }
                } else {
                    return undefined
                }
            } else {
                const children: TreeNode[] = []
                for(const key in config) {
                    const d = data ? data[key] : undefined
                    const t = titles[key]
                    const c = config[key]
                    if(t && c) {
                        const r = walk([...keyPath, key], d, t, c)
                        if(r) {
                            children.push(r)
                        }
                    }
                }
                if(children.length === 0) {
                    return undefined
                }
                return {
                    keyPath,
                    title: titles["$title"],
                    children
                }
            }
        }
    }

    export function treeToProperties(tree: TreeNode): DBSearch.IQueryDef["property"][] {
        const result = Array.from(walk(tree))
        return result

        function* walk(node: TreeNode): Generator<DBSearch.IQueryDef["property"]> {
            if("children" in node) {
                for(const c of node.children) {
                    yield* walk(c)
                }
            } else {
                if(node.value !== undefined) {
                    yield {
                        type: "property",
                        property: {
                            keyPath: node.keyPath,
                            value: node.value
                        }
                    }
                }
            }
        }

    }

    function convertListToTree<T>(properties: DBSearch.IQueryDef["property"][]): any {
        const result = {}
        for(const p of properties) {
            let n = result
            const keyPath = p.property.keyPath
            const value = p.property.value
            const len = keyPath.length
            for(let i=0; i<len-1; i++) {
                if(n[keyPath[i]]) {
                    n = n[keyPath[i]]
                } else {
                    n = n[keyPath[i]] = {}
                }
            }
            n[keyPath[len-1]] = value
        }
        return result
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
