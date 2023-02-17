import { DbUiConfiguration } from ".";
import { DBSearch } from "../data";

export module DBConfigActions {
    export type Actions<DP extends DbUiConfiguration.DataPropsBase> = {
        openItem(collectionName: Extract<keyof DP["collections"], string>, itemId: string): void
        openSearch(collectionName: Extract<keyof DP["collections"], string>, query: DBSearch.IQuery): void
    }
}