import { IOfflineClient } from "@xnh-db/protocol"
import * as idb from "idb"
import {IdbStoreWrapper} from "./wrapper"

export module GlobalStatusWrapper {
    const storageStatusWrapper = new IdbStoreWrapper<IOfflineClient.LatestStatus, never>("_collections_meta", {})

    export function initialize(db: idb.IDBPDatabase) {
        storageStatusWrapper.initialize(db)
    }

    export async function getCollectionStatus(db: idb.IDBPDatabase, collectionName: string): Promise<IOfflineClient.LatestStatus> {
        return await storageStatusWrapper.get(db, collectionName) ?? {
            updatedAt: new Date(0)
        }
    }

    export async function setCollectionStatus(db: idb.IDBPDatabase, collectionName: string, status: IOfflineClient.LatestStatus): Promise<void> {
        await storageStatusWrapper.put(db, collectionName, status)
    }
}