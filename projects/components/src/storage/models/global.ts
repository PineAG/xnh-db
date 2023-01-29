import { IOfflineClient, FieldConfig as FC, extractValuesAndConfigs } from "@xnh-db/protocol"
import * as idb from "idb"
import { DeepPartial } from "utility-types"
import {IdbStoreWrapper} from "./wrapper"

export module GlobalStatusWrapper {
    const storageStatusWrapper = new IdbStoreWrapper<{updatedAt: number}, never>("_collections_meta", {})

    export function initialize(db: idb.IDBPDatabase) {
        storageStatusWrapper.initialize(db)
    }

    export async function getCollectionStatus(db: idb.IDBPDatabase, collectionName: string): Promise<IOfflineClient.LatestStatus> {
        const result = await storageStatusWrapper.get(db, collectionName) ?? {
            updatedAt: 0
        }
        return {
            updatedAt: new Date(result.updatedAt)
        }
    }

    export async function setCollectionStatus(db: idb.IDBPDatabase, collectionName: string, status: IOfflineClient.LatestStatus): Promise<void> {
        await storageStatusWrapper.put(db, collectionName, {updatedAt: status.updatedAt.getTime()})
    }
}

export module IdbTagWrapper {
    export interface ITag {
        collection: string,
        tag: string
    }
    const wrapper = new IdbStoreWrapper<ITag, "collection" | "tag">("_tags", {
        collection: {isArray: false, unique: false, keyPath: "collection"},
        tag: {isArray: false, unique: false, keyPath: "tag"},
    })
    
    export function initialize(db: idb.IDBPDatabase) {
        wrapper.initialize(db)
    }

    export async function putTag(db: idb.IDBPDatabase, collection: string, tag: string): Promise<void> {
        await wrapper.put(db, `${collection}:${tag}`, {tag, collection})
    }

    export async function putTagsByConfig<T>(db: idb.IDBPDatabase, data: DeepPartial<T>, config: FC.ConfigFromDeclaration<T>): Promise<void> {
        for(const [value, conf] of extractValuesAndConfigs<T>(data, this.config)) {
            if(conf.type === "string" && conf.options.type === "tag") {
                const collection = conf.options.collection
                const values: string[] = conf.isArray ? value : [value]
                await Promise.all(values.map(v => IdbTagWrapper.putTag(db, collection, v)))
            }
        }
    }

    export class Client {
        constructor(private db: idb.IDBPDatabase) {}

        async getTagsFromCollection(collection: string): Promise<string[]> {
            const result = await wrapper.getAllByIndex(this.db, "collection", collection)
            return result.map(it => it.tag)
        }

        async putTag(collection: string, tag: string): Promise<void> {
            await putTag(this.db, collection, tag)
        }

        async deleteTag(collection: string, tag: string): Promise<void> {
            await wrapper.delete(this.db, `${collection}:${tag}`)
        }
    }

}