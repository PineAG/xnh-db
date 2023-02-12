import { createNullableContext, useNullableContext } from "@pltk/components"
import { FieldConfig } from "@xnh-db/protocol"
import { useEffect, useState } from "react"
import { DbUiConfiguration } from "../../config"
import { DBSearch } from "../../data/search"
import { DbContexts } from "../context"
import { GlobalSyncComponents } from "../sync"

export module DBSearchWrapper {
    import Utils = DbUiConfiguration.InternalUtils

    type DBSearchState = {
        query: DBSearch.IQuery
        search(query: DBSearch.IQuery): void
        collectionName: string
        results: {
            pending: false,
            items: string[]
        } | {
            pending: true
        }
    }

    const SearchResultContext = createNullableContext<DBSearchState>("Not in SearchProvider")
    
    export interface SearchProviderProps {
        collection: string
        children: React.ReactNode
        searchQuery: string
        onChange: (query: string) => Promise<void>
        patchSearch?: (query: DBSearch.IQuery) => DBSearch.IQuery
    }
    
    export function SearchProvider(props: SearchProviderProps) {
        const config = DbContexts.useProps()
        const clients = GlobalSyncComponents.useClients()

        const query = parseQuery(props.searchQuery)

        const [items, setItems] = useState<null | string[]>(null)

        useEffect(() => {
            initialize()
        }, [props.collection, props.searchQuery])
    
        const state: DBSearchState = {
            query,
            search,
            collectionName: props.collection,
            results: items === null ? {pending: true}: {pending: false, items}
        }

        return <SearchResultContext.Provider value={state}>
            {props.children}
        </SearchResultContext.Provider>

        async function initialize() {
            setItems(null)
            const inputQuery = props.patchSearch ? props.patchSearch(query) : query
            const results = await DBSearch.search(clients.clients.query, props.collection, inputQuery)
            setItems(results.map(it => it.id))
        }

        function search(query: DBSearch.IQuery) {
            props.onChange(stringifyQuery(query))
        }
    }

    export function useSearchResults(): DBSearchState {
        return useNullableContext(SearchResultContext)
    }

    function defaultSearchQuery(): DBSearch.IQuery {
        return {
            type: "merge",
            operator: "and",
            children: []
        }
    }

    export function stringifyQuery(query: DBSearch.IQuery): string {
        return encodeURIComponent(JSON.stringify(query))
    }

    export function parseQuery(s: string): DBSearch.IQuery {
        if(!s) {
            return defaultSearchQuery()
        } else {
            return JSON.parse(decodeURIComponent(s))
        }
    }
}