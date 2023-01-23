import { CollectionIndex, ICollectionReadonlyClient, ICollectionReadWriteClient, IRelationReadonlyClient, IRelationReadWriteClient } from "./client";

export type CollectionSyncAction = {type: "create" | "update" | "delete", id: string, date: Date}

export function diffCollectionIndices(sourceIndex: CollectionIndex, destinationIndex: CollectionIndex): CollectionSyncAction[] {
    const result: CollectionSyncAction[] = []
    for(const k of Object.keys(sourceIndex)) {
        const srcDate = sourceIndex[k]
        if(k in destinationIndex) {
            const dstDate = destinationIndex[k]
            if(srcDate.getTime() > dstDate.getTime()) {
                result.push({type: "update", id: k, date: srcDate})
            }
        } else {
            result.push({type: "create", id: k, date: srcDate})
        }
    }
    for(const k of Object.keys(destinationIndex)) {
        const dstDate = destinationIndex[k]
        if(!(k in sourceIndex)) {
            result.push({type: "delete", id: k, date: dstDate})
        }
    }
    return result
}

type ProgressResult = {current: number, total: number}

export async function* synchronizeCollection<T>(sourceClient: ICollectionReadonlyClient<T>, destinationClient: ICollectionReadWriteClient<T>): AsyncGenerator<[CollectionSyncAction, ProgressResult]> {
    const sourceIndex = await sourceClient.getIndex()
    const destinationIndex = await destinationClient.getIndex()
    const diffResult = diffCollectionIndices(sourceIndex, destinationIndex)
    let counter = 0
    for(const action of diffResult) {
        if(action.type === "create") {
            const item = await sourceClient.getItem(action.id)
            await destinationClient.updateItem(action.id, item, new Date())
        } else if(action.type === "update") {
            const item = await sourceClient.getItem(action.id)
            await destinationClient.updateItem(action.id, item, action.date)
        } else if(action.type === "delete") {
            await destinationClient.deleteItem(action.id, action.date)
        }
        yield [action, {current: counter++, total: diffResult.length}]
    }
}

export async function* synchronizeRelation(sourceClient: IRelationReadonlyClient, destinationClient: IRelationReadWriteClient): AsyncGenerator<[CollectionSyncAction, ProgressResult]> {
    const sourceIndex = await sourceClient.getIndex()
    const destinationIndex = await destinationClient.getIndex()
    const diffResult = diffCollectionIndices(sourceIndex, destinationIndex)
    let counter = 0
    for(const action of diffResult) {
        if(action.type === "create" || action.type === "update") {
            const srcTargets = new Set(await sourceClient.getTargetsById(action.id))
            const dstTargets = new Set(await destinationClient.getTargetsById(action.id))
            for(const targetId of srcTargets) {
                if(!dstTargets.has(targetId)) {
                    await destinationClient.linkToTarget(action.id, targetId, action.date)
                }
            }
            for(const targetId of dstTargets) {
                if(!srcTargets.has(targetId)) {
                    await destinationClient.unlinkTarget(action.id, targetId, action.date)
                }
            }
        } else if(action.type === "delete") {
            await destinationClient.unlinkAllTargetsById(action.id, action.date)
        }
        yield [action, {current: counter++, total: diffResult.length}]
    }
}
