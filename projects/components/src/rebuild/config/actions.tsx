import { DbUiConfiguration } from ".";
import { DBSearch } from "../data";

export module DBConfigActions {
    export type Actions<DP extends DbUiConfiguration.DataPropsBase> = {
        useOpenItem(collectionName: Extract<keyof DP["collections"], string>): (itemId: string) => void
        useOpenSearch(collectionName: Extract<keyof DP["collections"], string>): (query: DBSearch.IQuery) => void
    }
}