import React from "react"
import crypto from "crypto"
import "fake-indexeddb/auto"
import { XnhUiConfiguration } from "."
import { DBSearch, DBSearchWrapper, DBStorage, GlobalSyncComponents, SearchInputComponents } from "../rebuild"
import { DbContexts } from "../rebuild/components/context"

const config = XnhUiConfiguration.config
const layouts = XnhUiConfiguration.layouts

function TestComponent() {
    return <DbContexts.AppProvider config={config} layout={layouts} dbName="test-db">
            <GlobalSyncComponents.Mock.GlobalSyncWrapper>
                <DBSearchWrapper.SearchProvider>
                    <SearchInputComponents.DBSearchInput />
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

        const component = 
    })
})
