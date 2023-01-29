import { IOfflineClient } from "./base";
import { ProgressResult } from "./progress";

export type CollectionSyncAction<Key> = {type: "create" | "update" | "delete", key: Key, date: Date}

export function diffCollectionIndices<K>(sourceIndex: IOfflineClient.CollectionIndex<K>, destinationIndex: IOfflineClient.CollectionIndex<K>, keySerializer: (key: K) => string): CollectionSyncAction<K>[] {
    const result: CollectionSyncAction<K>[] = []
    const sourceKeys = new Map(sourceIndex.map(it => [keySerializer(it.key), it]))
    const destKeys = new Map(destinationIndex.map(it => [keySerializer(it.key), it]))
    for(const k of sourceKeys.keys()) {
        const srcItem = sourceKeys.get(k)
        if(destKeys.has(k)) {
            const dstItem = destKeys.get(k)
            if(srcItem.date.getTime() > dstItem.date.getTime()) {
                result.push({type: "update", key: srcItem.key, date: srcItem.date})
            }
        } else {
            result.push({type: "create", key: srcItem.key, date: srcItem.date})
        }
    }
    for(const k of destKeys.keys()) {
        const dstItem = destKeys.get(k)
        if(!sourceKeys.has(k)) {
            result.push({type: "delete", key: dstItem.key, date: dstItem.date})
        }
    }
    return result
}

function getLatestDateFromIndex<T>(index: IOfflineClient.CollectionIndex<T>): Date {
    if(index.length === 0) {
        return new Date(0)
    }
    return new Date(index.map(it => it.date.getTime()).reduce((a, b) => Math.max(a, b)))
}

export async function* synchronizeCollection<T>(sourceClient: IOfflineClient.Collection<T>, destinationClient: IOfflineClient.Collection<T>): AsyncGenerator<ProgressResult.Progress> {
    yield {type: "index", action: "pull"}
    const sourceIndex = await sourceClient.getIndex()
    const destinationIndex = await destinationClient.getIndex()
    const diffResult = diffCollectionIndices(sourceIndex, destinationIndex, it => it)
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
    await destinationClient.flushIndex(sourceIndex)
    await destinationClient.setStatus({
        updatedAt: getLatestDateFromIndex(sourceIndex)
    })
}

export async function* synchronizeRelation<Keys extends string, Payload>(sourceClient: IOfflineClient.Relation<Keys, Payload>, destinationClient: IOfflineClient.Relation<Keys, Payload>): AsyncGenerator<ProgressResult.Progress> {
    yield {type: "index", action: "pull"}
    const sourceIndex = await sourceClient.getIndex()
    const destinationIndex = await destinationClient.getIndex()
    const diffResult = diffCollectionIndices(sourceIndex, destinationIndex, IOfflineClient.stringifyRelationKey)
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
    await destinationClient.flushIndex(sourceIndex)
    await destinationClient.setStatus({
        updatedAt: getLatestDateFromIndex(sourceIndex)
    })
}
