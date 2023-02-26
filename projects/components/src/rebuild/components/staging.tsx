import { FieldConfig, IOfflineClient } from "@xnh-db/protocol"
import { useMemo } from "react"
import { DbUiConfiguration } from "../config"
import { XBinding } from "./binding"
import { createNullableContext, DbContexts, useNullableContext } from "./context"
import { GlobalSyncComponents } from "./sync"

export module StagingUtils {
    type DPBase = DbUiConfiguration.DataPropsBase

    type RelationKey = Record<string, string>
    type RelationItem = {key: RelationKey, payload: FieldConfig.EntityBase}

    export interface StagingState {
        collections: Record<string, Partial<Record<string, FieldConfig.EntityBase>>>
        relations: Record<string, Record<string, RelationItem>>
        files: Partial<Record<string, Blob>>
    }

    type StagingBinding = XBinding.Binding<StagingState>

    interface StagingBindingGroup {
        loaded: StagingBinding
        current: StagingBinding
    }

    interface ActionsBase<K, T> {
        read(id: K): Promise<T>
        write(id: K, value: T): Promise<void>
        delete(id: K): Promise<void>
    }

    const StagingContext = createNullableContext<StagingBindingGroup>("Not in StagingUtils.Provider")

    export const Provider = StagingContext.Provider
    
    export function useStagingState(): StagingBindingGroup {
        const globalProps = DbContexts.useProps()
        const emptyState = useMemo(() => createEmptyState(globalProps.props), [])
        const loadedBindings = XBinding.useBinding<StagingState>(emptyState)
        const currentBindings = XBinding.useBinding<StagingState>(emptyState)
        return {loaded: loadedBindings, current: currentBindings}
    }

    export function useEntityActions(collectionName: string): ActionsBase<string, FieldConfig.EntityBase> {
        const {current, loaded} = useNullableContext(StagingContext)
        const clients = GlobalSyncComponents.useQueryClients()
        const client = clients.collections[collectionName]

        const currentBinding = BindingWrapper.from(XBinding.propertyOf(current).join("collections").join(collectionName))
        const loadedBinding = BindingWrapper.from(XBinding.propertyOf(loaded).join("collections").join(collectionName))

        return {
            async read(id) {
                if(loadedBinding.exists(id)) {
                    const item = loadedBinding.read(id)
                    currentBinding.write(id, item)
                    return item
                }
                const item = await client.getItemById(id)
                currentBinding.write(id, item)
                loadedBinding.write(id, item)
                return item
            },
            async write(id, item) {
                currentBinding.write(id, item)
            },
            async delete(id) {
                currentBinding.delete(id)
            }
        }
    }

    export function useRelationActions(relationName: string): ActionsBase<RelationKey, FieldConfig.EntityBase> {
        const {current, loaded} = useNullableContext(StagingContext)
        const clients = GlobalSyncComponents.useQueryClients()
        const client = clients.relations[relationName]

        const currentBinding = BindingWrapper.from(XBinding.propertyOf(current).join("relations").join(relationName))
        const loadedBinding = BindingWrapper.from(XBinding.propertyOf(loaded).join("relations").join(relationName))
        
        return {
            async read(key) {
                const id = IOfflineClient.stringifyRelationKey(key)
                if(loadedBinding.exists(id)) {
                    const item = loadedBinding.read(id)
                    currentBinding.write(id, item)
                    return item
                }
                const payload = await client.getPayload(key)
                const item = {key, payload}
                currentBinding.write(id, item)
                loadedBinding.write(id, item)
                return payload
            },
            async write(key, payload) {
                const id = IOfflineClient.stringifyRelationKey(key)
                currentBinding.write(id, {key, payload})
            },
            async delete(key) {
                const id = IOfflineClient.stringifyRelationKey(key)
                currentBinding.delete(id)
            }
        }
    }

    export function useFileActions(): ActionsBase<string, Blob> {
        const {current, loaded} = useNullableContext(StagingContext)
        const clients = GlobalSyncComponents.useQueryClients()
        const client = clients.files

        const currentBinding = BindingWrapper.from(XBinding.propertyOf(current).join("files"))
        const loadedBinding = BindingWrapper.from(XBinding.propertyOf(loaded).join("files"))

        return {
            async read(fileName) {
                const blob = await client.read(fileName)
                loadedBinding.write(fileName, blob)
                currentBinding.write(fileName, blob)
                return blob
            },
            async write(fileName, value) {
                currentBinding.write(fileName, value)
            },
            async delete(fileName) {
                currentBinding.delete(fileName)
            }
        }
    }

    export function useApplyChanges() {
        const clients = GlobalSyncComponents.useQueryClients()
        const {current, loaded} = useNullableContext(StagingContext)

        return async () => {
            // TODO:
        }
    }

    class BindingWrapper<T> {
        constructor(private binding: XBinding.Binding<Record<string, T>>) {}

        read(id: string): T {
            return XBinding.propertyOf(this.binding).join(id).value
        }

        write(id: string, value: T): void {
            XBinding.propertyOf(this.binding).join(id).update(value)
        }

        delete(id: string): void {
            const items = {...this.binding.value}
            delete items[id]
            this.binding.update(items)
        }

        exists(id: string): boolean {
            return id in this.binding.value
        }

        static from<T>(binding: XBinding.Binding<Record<string, T>>) {
            return new BindingWrapper<T>(binding)
        }
    }

    function createEmptyState(config: DPBase): StagingState {
        const collections: Record<string, {}> = {}
        const relations: Record<string, {}> = {}
        const files: Partial<Record<string, Blob>> = {}

        for(const c in config.collections) {
            collections[c] = {}
        }

        for(const r in config.relations) {
            relations[r] = {}
        }

        return {collections, relations, files}

    }
}
