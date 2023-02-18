import React, { useState } from "react"
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import crypto from "crypto"
import "fake-indexeddb/auto"
import { XnhUiConfiguration } from "."
import { DBSearch, DBSearchWrapper, DBStorage, GlobalSyncComponents, SearchInputComponents, SearchResultComponents } from "../rebuild"
import { DbContexts } from "../rebuild/components/context"

const config = XnhUiConfiguration.config
const layouts = XnhUiConfiguration.layouts

function TestComponent() {
    const [query, setQuery] = useState("")
    return <DbContexts.AppProvider 
            config={config} layout={layouts} dbName="test-db"
            actions={{
                useOpenItem(collectionName) {
                    return () => {}
                },
                useOpenSearch(collectionName) {
                    return () => {}
                },
            }}
            >
            <GlobalSyncComponents.Mock.GlobalSyncWrapper>
                <DBSearchWrapper.SearchProvider
                        collection="character"
                        searchQuery={query}
                        onChange={setQuery}
                    >
                    <SearchInputComponents.DBSearchInput />
                    <SearchResultComponents.ResultList/>
                </DBSearchWrapper.SearchProvider>
            </GlobalSyncComponents.Mock.GlobalSyncWrapper>
        </DbContexts.AppProvider>
}

describe("UI Config Test", () => {
    it("happy case", async () => {
        const clients = DBStorage.createMemoryStorage(config, "test")
        const id = crypto.randomUUID()
        await clients.local.collections.artwork.updateItem(id, { title: "Megaman EXE" })
        const itemOut = await clients.query.collections.artwork.getItemById(id)
        expect(itemOut.title).toBe("Megaman EXE")
        const fullTextResult = await clients.query.collections.artwork.queryFullText("Mega")
        expect(fullTextResult[0].id).toBe(id)

        // render(<TestComponent/>)
    })
})
