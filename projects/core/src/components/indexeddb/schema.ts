import { DBClients } from "@xnh-db/common"
import idb from "idb"

export module IndexedDBSchema {
    export interface Schema extends idb.DBSchema {
        [key: string]: Record<"key" | "value" | "indexes", any>

        // entities
        entityIndex: {
            key: string
            value: Entity.EntityIndex
            indexes: typeof Entity.entityIndices
        }
        entityData: {
            key: string
            value: Entity.EntityBase
            indexes: {}
        }
        
        // properties
        propertyIndex: {
            key: string
            value: Property.EntityIndex
            indexes: typeof Property.entityIndices
        }
        propertyGlobal: {
            key: string
            value: Property.GlobalIndex
            indexes: typeof Property.globalIndices
        }

        // full text
        fullTextEntity: {
            key: string
            value: FullText.EntityIndex,
            indexes: typeof FullText.entityIndices
        }
        fullTextCollection: {
            key: string
            value: FullText.CollectionIndex,
            indexes: typeof FullText.collectionIndices
        }
        fullTextGlobal: {
            key: string
            value: FullText.GlobalIndex
            indexes: {}
        }

        // files
        fileOfEntity: {
            key: string,
            value: Files.EntityIndex,
            indexes: typeof Files.entityIndices
        }
        fileIndex: {
            key: string,
            value: Files.FileIndex,
            indexes: typeof Files.fileIndices
        }
        fileContent: {
            key: string,
            value: Files.FileContent
            indexes: {}
        }
    }

    export type StoreIndexBase<T extends {}> = {readonly [key: string]: (keyof T) | readonly (keyof T)[]}

    type _EraseArrayConst<L extends readonly string[]> = (
        L extends readonly [] ? [] :
        L extends readonly [infer First, ...infer Rest] ?
            Rest extends readonly string[] ?
                [string, ..._EraseArrayConst<Rest>]
                : never 
            : never
    )

    export type ApplyIndexDefinition<Idx> = {
        -readonly [K in keyof Idx]:
            Idx[K] extends readonly string[] ?
                _EraseArrayConst<Idx[K]> :
                string
    }

    const createIndicesFor = <T extends {}>() => ({
        as: function<const Idx extends StoreIndexBase<T>>(idx: Idx): ApplyIndexDefinition<Idx> {
            return idx as ApplyIndexDefinition<Idx>
        }
    })

    export module Entity {
        export function entityId(type: string, id: string): string {
            return `Entity_${type}_${id}`
        }
    
        export type EntityIndex = DBClients.EntityIndex
        export const entityIndices = createIndicesFor<EntityIndex>().as({
            status: "status",
            type: "type"
        })
    
        export type EntityBase = {}
    }

    export module Property {
        // entity
        export interface EntityIndex {
            type: string
            id: string
            propertyName: string
            propertyCollection: string
            values: string[]
        }
        export function entityId(type: string, id: string, property: string): string {
            return `Prop_${type}_${id}_${property}`
        }
        export const entityIndices = createIndicesFor<EntityIndex>().as({
            entity: ["type", "id"],
            property: ["propertyName", "values"]
        })

        // global
        export interface GlobalIndex {
            propertyCollection: string
            value: string
            counts: number
        }
        export function globalId(propertyCollection: string, value: string): string {
            return `GlobalProp_${propertyCollection}_${value}`
        }
        export const globalIndices = createIndicesFor<GlobalIndex>().as({
            propertyCollection: "propertyCollection"
        })
    }

    export module FullText {
        // entity
        export interface EntityIndex {
            type: string
            id: string
            term: string
            weight: number
        }
        export function entityId(type: string, id: string, term: string): string {
            return `Term_${type}_${id}_${term}`
        }
        export const entityIndices = createIndicesFor<EntityIndex>().as({
            entity: ["type", "id"]
        })
        
        // global
        export interface GlobalIndex {
            term: string
            totalWeight: number
        }
        export function globalId(term: string): string {
            return `GlobalTerm_${term}`
        }

        // collection
        export interface CollectionIndex {
            type: string
            term: string
            totalWeight: number
        }
        export function collectionId(type: string, term: string): string {
            return `CollectionTerm_${type}_${term}`
        }
        export const collectionIndices = createIndicesFor<CollectionIndex>().as({
            collection: "type"
        })
    }

    export module Files {
        // content
        export type FileContent = DBClients.FileContent

        // meta
        export type FileIndex = DBClients.FileIndex
        export const fileIndices = createIndicesFor<FileIndex>().as({
            status: "status"
        })

        // entity
        export interface EntityIndex {
            type: string
            id: string
            files: string[]
        }
        export function entityId(type: string, id: string): string {
            return `Files_${type}_${id}`
        }
        export const entityIndices = createIndicesFor<EntityIndex>().as({
            file: "files"
        })
    }
}