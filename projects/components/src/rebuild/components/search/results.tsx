import { DbUiConfiguration } from "../../config";
import { XBinding } from "../binding";
import { DbContexts } from "../context";
import { GlobalSyncComponents } from "../sync";
import { DBSearchWrapper } from "./wrapper";
import {useState, useEffect} from "react"
import { LayoutInjector } from "../inject";
import { SearchInputComponents } from "./input";
import { Flex, HStack } from "../utils";

export module SearchResultComponents {
    type GPBase = DbUiConfiguration.GlobalPropsBase
    type SimpleInjection = DbUiConfiguration.InternalUtils.Injection.SimplePageInjectionProps<GPBase, string>

    export interface CollectionItemSelectorProps {
        collectionName: string
        binding: XBinding.Binding<string | null>
    }

    export function CollectionItemSelector(props: CollectionItemSelectorProps) {
        const [query, setQuery] = useState("")

        const {Button, Loading, Divider} = DbContexts.useComponents()

        return <DBSearchWrapper.SearchProvider
                searchQuery={query}
                onChange={setQuery}
                collection={props.collectionName}
            >
            <Flex direction="vertical">
                <SearchInputComponents.DBSearchInput/>
                {!props.binding.value ? <></> : (
                    <HStack layout={["auto", "1fr"]}>
                        <ResultItem itemId={props.binding.value}/>
                        <Button type="primary" onClick={() => props.binding.update(null)}>取消选择</Button>
                    </HStack>
                )}
                <Divider/>
                <DBSearchWrapper.SearchConsumer>{(search) => {
                    if(search.results.pending === true) {
                        return <Loading/>
                    }
                    const items = search.results.items
                    return <Flex direction="vertical">
                        {items.map(it => {
                            if(it === props.binding.value) {
                                return <></>
                            }
                            return <HStack layout={["auto", "1fr"]}>
                                <ResultItem itemId={it}/>
                                <Button type="primary" onClick={() => props.binding.update(it)}>选择</Button>
                            </HStack>
                        })}
                    </Flex>
                }}</DBSearchWrapper.SearchConsumer>
            </Flex>
        </DBSearchWrapper.SearchProvider>
        
    }

    interface ResultListProps {
        onItemOpen(collectionName: string, id: string): void
    }
    
    export function ResultList({onItemOpen}: ResultListProps) {
        const {Empty, Loading} = DbContexts.useComponents()
        const {results, collectionName} = DBSearchWrapper.useSearchResults()

        if(results.pending === true) {
            return <Loading/>
        } else if (results.items.length === 0) {
            return <Empty/>
        } else {
            <Flex direction="vertical" spacing={8}>
                {results.items.map(id => (
                    <ResultItem
                        key={id}
                        itemId={id}
                        onClick={() => onItemOpen(collectionName, id)}
                    />
                ))}
            </Flex>
        }
    }

    interface ResultItemProps {
        itemId: string
        onClick?: () => void
    }
    export function ResultItem(props: ResultItemProps) {
        const {collectionName} = DBSearchWrapper.useSearchResults()
        const [injectionProps, setInjection] = useState<SimpleInjection | null>(null)
        const config = DbContexts.useProps()
        const {Card, Loading} = DbContexts.useComponents()
        const clients = GlobalSyncComponents.useClients()
        const ResultLayout = config.layout.layouts[collectionName].searchResult

        const createSimpleProps = LayoutInjector.useCreateSimpleProps(collectionName)

        useEffect(() => {
            initialize()
        }, [collectionName, props.itemId])

        if(injectionProps === null) {
            return <div style={{display: "grid", placeItems: "center"}}>
                <Loading/>
            </div>
        } else {
            <Card onClick={props.onClick}>
                <ResultLayout {...injectionProps}/>
            </Card>
        }

        async function initialize() {
            const injection = await createSimpleProps(props.itemId)
            setInjection(injection)
        }
        
    }
}
