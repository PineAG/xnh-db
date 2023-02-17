import { DBSearch } from "../../data/search"
import { DbContexts } from "../context"
import { GlobalSyncComponents } from "../sync"

import {useState, useEffect, useMemo} from "react"
import { DBSearchWrapper } from "./wrapper"
import { ConfigFlatten, FieldConfig } from "@xnh-db/protocol"
import { DbUiConfiguration, InternalGlobalLayouts } from "../../config"
import { Flex, FormItem, HStack } from "../utils"

export module SearchInputComponents {

    type SimpleQuery = {
        type: "merge"
        operator: "and",
        children: (DBSearch.IQueryDef["fullText"] | DBSearch.IQueryDef["property"])[]
    }

    function isSimpleQuery(query: DBSearch.IQuery): query is SimpleQuery {
        return query.type === "merge" && query.operator === "and" && query.children.every(it => it.type === "property" || it.type === "fullText")
    }

    export function DBSearchInput() {
        const search = DBSearchWrapper.useSearchResults()
        const {Card} = DbContexts.useComponents()

        if(!isSimpleQuery(search.query)) {
            return <Card>
                不支持该类查询
            </Card>
        }

        return <Card>
            <Flex direction="vertical" spacing={8}>
                <Flex direction="horizontal" spacing={8}>
                    {search.query.children.map((q, i) => {
                        if(q.type === "property" || q.type === "fullText") {
                            return <QueryTag key={i} query={q} onRemove={() => updateQuery(list => list.splice(i, 1))}/>
                        } else {
                            return <></>
                        }
                    })}
                </Flex>
                <HStack layout={["1fr", "1fr"]} spacing={24}>
                    <FormItem label="关键字">
                        <FullTextInput onSearch={q => updateQuery(list => list.push(...q))}/>
                    </FormItem>
                    <FormItem label="属性">
                        <PropertyInput onSearch={q => updateQuery(list => list.push(...q))}/>
                    </FormItem>
                </HStack>
            </Flex>
        </Card>

        function updateQuery(updater: (queries: DBSearch.IQuery[]) => void) {
            if(!isSimpleQuery(search.query)) {
                throw new Error()
            }
            const queries = Array.from(search.query.children)
            updater(queries)
            search.search({
                type: "merge",
                operator: "and",
                children: queries
            })
        }
    }

    interface QueryTagProps {
        query: DBSearch.IQueryDef["property"] | DBSearch.IQueryDef["fullText"]
        onRemove: () => void
    }
    function QueryTag({query, onRemove}: QueryTagProps) {
        const {SearchQueryTag} = DbContexts.useComponents()
        const search = DBSearchWrapper.useSearchResults()
        const flatTitles = useFlatTitles(search.collectionName)
        
        let content: string
        if(query.type === "fullText") {
            content = query.keyword
        } else {
            const title = flatTitles[ConfigFlatten.stringifyKeyPath(query.property.keyPath)]
            content = `${title}: ${query.property.value}`
        }
        
        return <SearchQueryTag
            onClose={onRemove}
        >{content}</SearchQueryTag>
    }

    interface InputProps<Q extends DBSearch.IQuery> {
        onSearch(query: Q[]): void
    }
    
    function PropertyInput(props: InputProps<DBSearch.IQueryDef["property"]>) {
        const {collectionName} = DBSearchWrapper.useSearchResults()
        const flatConfig = useFlatConfig(collectionName)
        const flatPath = useFlatKeyPath(collectionName)

        const {TreeSelect, Select, Button} = DbContexts.useComponents()

        const {clients} = GlobalSyncComponents.useClients()

        const [propertyPath, setPropertyPath] = useState("")
        const [tags, setTags] = useState<string[] | null>(null)
        const [selectedTag, setSelectedTag] = useState("")

        const propertyTree = usePropertyTree(collectionName)

        return <HStack layout={["1fr", "1fr", "auto"]} spacing={8}>
            <TreeSelect
                value={propertyPath}
                onChange={value => {
                    setPropertyPath(value)
                    loadTags(value)
                }}
                options={propertyTree}/>
            <Select
                value={selectedTag}
                onChange={setSelectedTag}
                disabled={tags === null}
                options={tags?.map(it => ({
                    label: it,
                    value: it
                })) ?? []}
            />
            <Button icon="add" disabled={!selectedTag} onClick={searchProperty} type="primary">搜索属性</Button>
        </HStack>

        async function loadTags(propertyName: string) {
            setTags(null)
            const conf = flatConfig[propertyName]
            if(conf && (conf.type === "tag" || conf.type === "tagList")) {
                const tags = await clients.query.tags.getTagsByCollection(conf.options.collection)
                setTags(tags)
            }
        }

        function searchProperty() {
            if(propertyPath && selectedTag) {
                props.onSearch([{type: "property", property: {
                    keyPath: flatPath[propertyPath],
                    value: selectedTag
                }}])
            }
        }
    }

    function usePropertyTree(collectionName: string): InternalGlobalLayouts.ComponentProps.TreeNode[] {
        const flatTitles = useFlatTitles(collectionName)
        const config = DbContexts.useProps().props.collections[collectionName].config
        return useMemo(() => {
            const root = walk([], config)
            const children = root.children as InternalGlobalLayouts.ComponentProps.TreeNode[]
            return children ?? []
        }, [collectionName])

        function walk(path: string[], c: any): InternalGlobalLayouts.ComponentProps.TreeNode {
            const keyPath = ConfigFlatten.stringifyKeyPath(path)
            if(FieldConfig.Fields.isEndpointType(c)) {
                return {
                    label: flatTitles[keyPath],
                    value: ConfigFlatten.stringifyKeyPath(path)
                }
            } else {
                const children = Object.keys(c).map(k => walk([...path, k], c[k]))
                return {
                    label: flatTitles[keyPath],
                    value: keyPath,
                    children
                }
            }
        }
    }

    function FullTextInput(props: InputProps<DBSearch.IQueryDef["fullText"]>) {
        const [inputText, setInputText] = useState("")
        const [autoCompletes, setAutoCompletes] = useState<string[]>([])

        const {AutoComplete, Button} = DbContexts.useComponents()
        const {collectionName} = DBSearchWrapper.useSearchResults()
        const {clients} = GlobalSyncComponents.useClients()

        useEffect(() => {
            onSearch()
        }, [])

        return <HStack layout={["1fr", "auto"]} spacing={8}>
            <AutoComplete
                value={inputText}
                onChange={setInputText}
                onSearch={onSearch}
                options={autoCompletes}
            />
            {/* <AntInput value={searchText} onChange={evt => {setSearchText(evt.target.value)}}/> */}
            <Button icon="add" onClick={onComplete} type="primary">搜索关键字</Button>
        </HStack>

        async function onSearch() {
            const results = await clients.query.collections[collectionName].autocompleteFullText(inputText, 20)
            setAutoCompletes(results)
        }

        function onComplete() {
            if(!inputText) return;
            const queries = inputText.split(/\s+/).map<DBSearch.IQueryDef["fullText"]>(it => ({
                type: "fullText",
                keyword: it
            }))
            if(queries.length === 0) return;
            props.onSearch(queries)
            setInputText("")
        }
    }

    function useFlatKeyPath(collectionName: string): Record<string, string[]> {
        const config = DbContexts.useProps()
        const collConf = config.props.collections[collectionName].config

        return useMemo(() => {
            return Object.fromEntries(walk([], collConf))
        }, [collectionName])

        function* walk(p: string[], c: any) {
            yield [ConfigFlatten.stringifyKeyPath(p), p]
            if(!FieldConfig.Fields.isEndpointType(c)) {
                for(const key in c) {
                    yield* walk([...p, key], c[key])
                }
            }
        }
    }

    function useFlatConfig(collectionName: string): Record<string, FieldConfig.Fields.EndpointTypes> {
        const config = DbContexts.useProps()
        const collConf = config.props.collections[collectionName].config
        return useMemo(() => {
            return Object.fromEntries(ConfigFlatten.flattenConfig(collConf).map(([keyPath, conf]) => [ConfigFlatten.stringifyKeyPath(keyPath), conf]))
        }, [collectionName])
    }

    function useFlatTitles(collectionName: string): Record<string, string> {
        const config = DbContexts.useProps()
        const titles = config.layout.titles.entityTitles[collectionName]
        const collConf = config.props.collections[collectionName].config

        return useMemo(() => {
            return Object.fromEntries(
                Array.from(
                    walk([], titles, collConf)
                ).map(
                    ([p, t]) => [ConfigFlatten.stringifyKeyPath(p), t]
                ))
        }, [collectionName])

        function* walk(path: string[], t: any, c: any): Generator<[string[], string]> {
            if(FieldConfig.Fields.isEndpointType(c)) {
                yield [path, t]
            } else {
                yield [path, t["$title"]]
                for(const key in config) {
                    yield* walk([...path, key], t[key], c[key])
                }
            }
        }
    }
}