import { FieldConfig, IOfflineClient } from "@xnh-db/protocol"
import { useMemo } from "react"
import { DbUiConfiguration } from "../config"
import { XBinding } from "./binding"
import { createNullableContext, DbContexts, useNullableContext } from "./context"
import { GlobalSyncComponents } from "./sync"

export module StagingUtils {
    type DPBase = DbUiConfiguration.DataPropsBase

    type RelationKey = Record<string, string>

    export type StagingActions = "write" | "delete"

    type StagingMapping<K, T> = {
        keys: Record<string, K>
        values: Record<string, T>
        actions: Record<string, StagingActions>
    }

    export interface StagingState {
        collections: Record<string, StagingMapping<string, FieldConfig.EntityBase>>
        relations: Record<string, StagingMapping<RelationKey, FieldConfig.EntityBase>>
        files: StagingMapping<string, Blob>
    }

    const StagingContext = createNullableContext<XBinding.Binding<StagingState>>("Not inside StagingProvider")

    export function StagingProvider(props: {children: React.ReactNode}) {
        const binding = XBinding.useBinding(useEmptyStagingState())
        return <StagingContext.Provider value={binding}>
            {props.children}
        </StagingContext.Provider>
    }

    function useEmptyStagingState(): StagingState {
        const globalProps = DbContexts.useProps()
        return useMemo(() => {
            const result: StagingState = {
                collections: {},
                relations: {},
                files: {keys: {}, values: {}, actions: {}}
            }
            for(const collectionName in globalProps.props.collections) {
                result.collections[collectionName] = {keys: {}, values: {}, actions: {}}
            }
            for(const relationName in globalProps.props.relations) {
                result.relations[relationName] = {keys: {}, values: {}, actions: {}}
            }
            return result
        }, [globalProps])
    }

    export function useCollections(collectionName: string): IMappingBackend<string, FieldConfig.EntityBase> {
        const binding = useNullableContext(StagingContext)
        const client = GlobalSyncComponents.useQueryClients().collections[collectionName]
        const properties = XBinding.propertyOf(binding).join("collections").join(collectionName)
        return new StagingMappingManager({
            binding: properties,
            idSerializer: id => id,
            backend: {
                read: id => {
                    return client.getItemById(id)
                },
                write: (id, value) => {
                    return client.putItem(id, value)
                },
                delete: (id) => {
                    return client.deleteItem(id)
                }
            }
        })
    }

    export function useRelations(relationName: string): IMappingBackend<RelationKey, FieldConfig.EntityBase> {
        const binding = useNullableContext(StagingContext)
        const client = GlobalSyncComponents.useQueryClients().relations[relationName]
        const properties = XBinding.propertyOf(binding).join("relations").join(relationName)
        return new StagingMappingManager({
            binding: properties,
            idSerializer: id => IOfflineClient.stringifyRelationKey(id),
            backend: {
                read: async id => {
                    const payload = await client.getPayload(id)
                    return {key: id, payload}
                },
                write: (id, value) => {
                    return client.putRelation(id, value.payload)
                },
                delete: (id) => {
                    return client.deleteRelation(id)
                }
            }
        })
    }

    export function useFiles(): IMappingBackend<string, Blob> {
        const binding = useNullableContext(StagingContext)
        const client = GlobalSyncComponents.useQueryClients().files
        const properties = XBinding.propertyOf(binding).join("files")
        return new StagingMappingManager({
            binding: properties,
            idSerializer: id => id,
            backend: {
                read: id => {
                    return client.read(id)
                },
                write: (id, value) => {
                    return client.write(id, value)
                },
                delete: (id) => {
                    return client.delete(id)
                }
            }
        })
    }

    export function useCommit(): () => Promise<void> {
        const binding = useNullableContext(StagingContext)
        const clients = GlobalSyncComponents.useQueryClients()

        return async () => {
            const state = binding.value

            // collections
            for(const collectionName in state.collections) {
                const collections = state.collections[collectionName]
                const client = clients.collections[collectionName]
                for(const action of retrieveStagingActions(collections)) {
                    if(action.action === "write") {
                        await client.putItem(action.key, action.value)
                    } else {
                        await client.deleteItem(action.key)
                    }
                }
            }

            // relations
            for(const relationName in state.relations) {
                const relations = state.relations[relationName]
                const client = clients.relations[relationName]
                for(const action of retrieveStagingActions(relations)) {
                    if(action.action === "write") {
                        await client.putRelation(action.key, action.value)
                    } else {
                        await client.deleteRelation(action.key)
                    }
                }
            }

            // files
            for(const action of retrieveStagingActions(state.files)) {
                if(action.action === "write") {
                    await clients.files.write(action.key, action.value)
                } else {
                    await clients.files.delete(action.key)
                }
            }
        }
    }

    function* retrieveStagingActions<K, T>(state: StagingMapping<K, T>): Generator<{action: "write", key: K, value: T} | {action: "delete", key: K}> {
        for(const idString in state.actions) {
            const action = state.actions[idString]
            const key = state.keys[idString]
            if(action === "write") {
                const value = state.values[idString]
                yield {action, key, value}
            } else {
                yield {action, key}
            }
        }
    }


    export interface IMappingBackend<K, T> {
        read(id: K): Promise<T>
        write(id: K, value: T): Promise<void>
        delete(id: K): Promise<void>
    }

    type StagingMappingManagerOptions<K, T> = {
        binding: XBinding.Binding<StagingMapping<K, T>>
        idSerializer(key: K): string
        backend: IMappingBackend<K, T>
    }

    export class StagingMappingManager<K, T> implements IMappingBackend<K, T> {
        private binding: XBinding.Binding<StagingMapping<K, T>>
        private idSerializer: (key: K) => string
        private client: IMappingBackend<K, T>
        constructor(options: StagingMappingManagerOptions<K, T>) {
            this.binding = options.binding
            this.idSerializer = options.idSerializer
            this.client = options.backend
        }

        private get keys() {
            return XBinding.propertyOf(this.binding).join("keys")
        }
        
        private get values() {
            return XBinding.propertyOf(this.binding).join("values")
        }

        private get actions() {
            return XBinding.propertyOf(this.binding).join("actions")
        }

        async read(id: K): Promise<T> {
            const idString = this.idSerializer(id)
            const keyBinding = this.keys.join(idString)
            const itemBinding = this.values.join(idString)
            if(this.actions.value[idString] === "delete") {
                throw new Error(`Item has already been deleted: ${id}`)
            }
            if(idString in this.keys.value) {
                return itemBinding.value
            } else {
                const value = await this.client.read(id)
                itemBinding.update(value)
                keyBinding.update(id)
                return value
            }
        }
        
        async write(id: K, value: T): Promise<void> {
            const idString = this.idSerializer(id)
            const keyBinding = this.keys.join(idString)
            const itemBinding = this.values.join(idString)
            const actionBinding = this.actions.join(idString)
            keyBinding.update(id)
            itemBinding.update(value)
            actionBinding.update("write")
        }
        
        async delete(id: K): Promise<void> {
            const idString = this.idSerializer(id)
            const actionBinding = this.actions.join(idString)
            actionBinding.update("delete")
        }


    }
}