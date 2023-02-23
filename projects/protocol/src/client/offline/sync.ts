import { IOfflineClient } from "./base";
import { FieldConfig as FC } from "../config";

export module OfflineClientSynchronization {
    export module ProgressResult {
        export type ItemActionType = "create" | "update" | "delete"
    
        export interface ItemAction {
            type: ItemActionType
            id: string
            progress: {
                current: number
                total: number
            }
        }
        
        export type Progress = {type: "index", action: "pull" | "push"} | {type: "item" | "file", action: ItemAction}
    }


    export type CollectionSyncAction<Key> = {type: "create" | "update" | "delete", key: Key, date: Date}

    export function diffCollectionIndices<K>(sourceIndex: IOfflineClient.CollectionIndex<K>, destinationIndex: IOfflineClient.CollectionIndex<K>, keySerializer: (key: K) => string): [IOfflineClient.CollectionIndex<K>, CollectionSyncAction<K>[]] {
        const result: CollectionSyncAction<K>[] = []
        const newIndexMap = new Map<string, {key: K, date: Date}>()
        const sourceKeys = new Map(sourceIndex.map(it => [keySerializer(it.key), it]))
        const destKeys = new Map(destinationIndex.map(it => [keySerializer(it.key), it]))
        for(const [k, srcItem] of sourceKeys.entries()) {
            const dstItem = destKeys.get(k)
            if(dstItem) {
                if(srcItem.date.getTime() > dstItem.date.getTime()) {
                    result.push({type: "update", key: srcItem.key, date: srcItem.date})
                    newIndexMap.set(k, {
                        key: srcItem.key,
                        date: srcItem.date
                    })
                } else {
                    newIndexMap.set(k, {
                        key: srcItem.key,
                        date: dstItem.date
                    })
                }
            } else {
                result.push({type: "create", key: srcItem.key, date: srcItem.date})
                newIndexMap.set(k, srcItem)
            }
        }
        for(const [k, dstItem] of destKeys.entries()) {
            if(!sourceKeys.has(k)) {
                result.push({type: "delete", key: dstItem.key, date: dstItem.date})
            }
        }
        const newIndex = Array.from(newIndexMap.values())
        return [newIndex, result]
    }
    
    function getLatestDateFromIndex<T>(index: IOfflineClient.CollectionIndex<T>): Date {
        if(index.length === 0) {
            return new Date(0)
        }
        return new Date(index.map(it => it.date.getTime()).reduce((a, b) => Math.max(a, b)))
    }
    
    export async function* synchronizeCollection<T extends FC.EntityBase>(sourceClient: IOfflineClient.Collection<T>, destinationClient: IOfflineClient.Collection<T>): AsyncGenerator<ProgressResult.Progress> {
        yield {type: "index", action: "pull"}
        const [sourceStatus, destinationStatus] = await Promise.all([sourceClient.getStatus(), destinationClient.getStatus()])
        if(sourceStatus.updatedAt.getTime() <= destinationStatus.updatedAt.getTime()) {
            return
        }
    
        const sourceIndex = await sourceClient.getIndex()
        const destinationIndex = await destinationClient.getIndex()
        const [newIndex, diffResult] = diffCollectionIndices(sourceIndex, destinationIndex, it => it)
        let counter = 0
        for(const action of diffResult) {
            yield {
                type: "item",
                action: {
                    type: action.type,
                    id: action.key,
                    progress: {
                        current: counter++,
                        total: diffResult.length
                    }
                }
            }
            if(action.type === "create") {
                const item = await sourceClient.getItem(action.key)
                await destinationClient.updateItem(action.key, item)
            } else if(action.type === "update") {
                const item = await sourceClient.getItem(action.key)
                await destinationClient.updateItem(action.key, item)
            } else if(action.type === "delete") {
                await destinationClient.deleteItem(action.key)
            }
        }
        yield {type: "index", action: "push"}
        await destinationClient.flushIndex(newIndex)
        await destinationClient.setStatus({
            updatedAt: getLatestDateFromIndex(newIndex)
        })
    }
    
    export async function* synchronizeRelation<Keys extends string, Payload extends FC.EntityBase>(sourceClient: IOfflineClient.Relation<Keys, Payload>, destinationClient: IOfflineClient.Relation<Keys, Payload>): AsyncGenerator<ProgressResult.Progress> {
        yield {type: "index", action: "pull"}
        const [sourceStatus, destinationStatus] = await Promise.all([sourceClient.getStatus(), destinationClient.getStatus()])
        if(sourceStatus.updatedAt.getTime() <= destinationStatus.updatedAt.getTime()) {
            return
        }
    
        const sourceIndex = await sourceClient.getIndex()
        const destinationIndex = await destinationClient.getIndex()
        const [newIndex, diffResult] = diffCollectionIndices(sourceIndex, destinationIndex, IOfflineClient.stringifyRelationKey)
        let counter = 0
        for(const action of diffResult) {
            yield {
                type: "item",
                action: {
                    type: action.type,
                    id: JSON.stringify(action.key),
                    progress: {
                        current: counter++,
                        total: diffResult.length
                    }
                }
            }
            if(action.type === "create" || action.type === "update") {
                const payload = await sourceClient.getPayload(action.key)
                await destinationClient.updateRelation(action.key, payload)
            } else if(action.type === "delete") {
                await destinationClient.deleteRelation(action.key)
            } else {
                throw new Error(`Invalid state: ${action.type}`)
            }
        }
        yield {type: "index", action: "push"}
        await destinationClient.flushIndex(newIndex)
        await destinationClient.setStatus({
            updatedAt: getLatestDateFromIndex(newIndex)
        })
    }
    
    export module Files {
        export async function* upload(localClient: IOfflineClient.Files, remoteClient: IOfflineClient.Files): AsyncGenerator<ProgressResult.Progress> {
            yield {type: "index", action: "pull"}
            const [localStatus, remoteStatus] = await Promise.all([localClient.getStatus(), remoteClient.getStatus()])
            if(localStatus.updatedAt.getTime() <= remoteStatus.updatedAt.getTime()) {
                return
            }
        
            const sourceIndex = await localClient.getIndex()
            const destinationIndex = await remoteClient.getIndex()
            const [newIndex, diffResult] = diffCollectionIndices(sourceIndex, destinationIndex, it => it)
            console.log("src", sourceIndex)
            console.log("dst", destinationIndex)
            console.log("diff", diffResult)
            console.log("new", newIndex)
            let counter = 0
            for(const action of diffResult) {
                yield {
                    type: "file",
                    action: {
                        type: action.type,
                        id: action.key,
                        progress: {
                            current: counter++,
                            total: diffResult.length
                        }
                    }
                }
                if(action.type === "create" || action.type === "update") {
                    const data = await localClient.read(action.key)
                    await remoteClient.write(action.key, data)
                } else if(action.type === "delete") {
                    await remoteClient.delete(action.key)
                }
            }
            yield {type: "index", action: "push"}
            await remoteClient.flushIndex(newIndex)
            await remoteClient.setStatus({
                updatedAt: getLatestDateFromIndex(newIndex)
            })
        }
    
        
        export async function* download(localClient: IOfflineClient.Files, remoteClient: IOfflineClient.Files): AsyncGenerator<ProgressResult.Progress> {
            yield {type: "index", action: "pull"}
            const [remoteStatus, localStatus] = await Promise.all([remoteClient.getStatus(), localClient.getStatus()])
            if(remoteStatus.updatedAt.getTime() <= localStatus.updatedAt.getTime()) {
                return
            }
        
            const sourceIndex = await remoteClient.getIndex()
            const destinationIndex = await localClient.getIndex()
            const [newIndex, diffResult] = diffCollectionIndices(sourceIndex, destinationIndex, it => it)
            let counter = 0
            for(const action of diffResult) {
                yield {
                    type: "file",
                    action: {
                        type: action.type,
                        id: action.key,
                        progress: {
                            current: counter++,
                            total: diffResult.length
                        }
                    }
                }
                await localClient.delete(action.key)
            }
            yield {type: "index", action: "push"}
            await localClient.flushIndex(newIndex)
            await localClient.setStatus({
                updatedAt: getLatestDateFromIndex(newIndex)
            })
        }
    }
}

