import { Flex, Loading } from "@pltk/components";
import { Card, Empty } from "antd";
import { DbUiConfiguration } from "../../config";
import { XBinding } from "../binding";
import { DbContexts } from "../context";
import { GlobalSyncComponents } from "../sync";
import { DBSearchWrapper } from "./wrapper";
import {useState, useEffect} from "react"
import { FieldConfig } from "@xnh-db/protocol";
import { LayoutInjector } from "../inject";

export module SearchResultComponents {
    type GPBase = DbUiConfiguration.GlobalPropsBase
    import Utils = DbUiConfiguration.InternalUtils
    type SimpleInjection = DbUiConfiguration.InternalUtils.Injection.SimplePageInjectionProps<GPBase, string>

    export interface CollectionItemSelectorProps {
        collectionName: string
        binding: XBinding.Binding<string | null>
    }

    export function CollectionItemSelector(props: CollectionItemSelectorProps) {
        const config = DbContexts.useProps()
        const clients = GlobalSyncComponents.useClients()
        return <span>还没做</span>
        // TODO:
    }

    interface ResultListProps {
        onItemOpen(collectionName: string, id: string): void
    }
    
    export function ResultList({onItemOpen}: ResultListProps) {
        const {results, collectionName} = DBSearchWrapper.useSearchResults()

        const clients = GlobalSyncComponents.useClients().clients.query
        
        if(results.pending === true) {
            return <Loading/>
        } else if (results.items.length === 0) {
            return <Empty/>
        } else {
            <Flex direction="vertical" spacing={8}>
                {results.items.map(id => (
                    <ResultItem
                        key={id}
                        collectionName={collectionName}
                        itemId={id}
                        onClick={() => onItemOpen(collectionName, id)}
                    />
                ))}
            </Flex>
        }
    }

    interface ResultItemProps {
        collectionName: string
        itemId: string
        onClick: () => void
    }
    export function ResultItem(props: ResultItemProps) {
        const [injectionProps, setInjection] = useState<SimpleInjection | null>(null)
        const config = DbContexts.useProps()
        const clients = GlobalSyncComponents.useClients()
        const ResultLayout = config.layout.layouts[props.collectionName].searchResult

        useEffect(() => {
            initialize()
        }, [props.collectionName, props.itemId])

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
            const injection = await LayoutInjector.createSimpleProps(config, clients.clients.query, props.collectionName, props.itemId)
            setInjection(injection)
        }
        
    }
}
