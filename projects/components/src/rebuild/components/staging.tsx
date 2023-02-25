import { IOfflineClient } from "@xnh-db/protocol"
import { XBinding } from "./binding"

export module StagingUtils {
    type RelationKey = Record<string, string>
    type RelationItem = {key: RelationKey, payload: any}

    export interface StagingState {
        collections: Record<string, Partial<Record<string, any>>>
        relations: Record<string, Record<string, RelationItem>>
        files: Partial<Record<string, Blob>>
    }

    type StagingBinding = XBinding.Binding<StagingState>

    export function bindFile(binding: StagingBinding, fileName: string): XBinding.Binding<Blob | null> {
        const b = XBinding.propertyOf(binding).join("files").join(fileName)
        return XBinding.defaultValue(b, () => null)
    }

    export function bindEntity(binding: StagingBinding, collectionName: string, itemId: string): XBinding.Binding<any> {
        const b = XBinding.propertyOf(binding).join("collections").join(collectionName).join(itemId)
        return XBinding.defaultValue(b, () => ({}))
    }

    export function bindRelationPayload(binding: StagingBinding, relationName: string, relationKey: RelationKey): XBinding.Binding<any> {
        const keyString = IOfflineClient.stringifyRelationKey(relationKey)
        const b = XBinding.propertyOf(binding).join("relations").join(relationName).join(keyString)
        const r = XBinding.defaultValue(b, () => ({key: relationKey, payload: {}}))
        return XBinding.propertyOf(r).join("payload")
    }
}
