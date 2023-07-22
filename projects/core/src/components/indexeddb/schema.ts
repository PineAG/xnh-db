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
            indexes: {}
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

    export type StoreIndexBase<T> = Readonly<Record<string, Readonly<(keyof T) | (keyof T)[]>>> & {[key: string]: string | string[]}

    type _EraseArrayConst<L extends string[]> = (
        L extends [] ? [] :
        L extends [infer First, ...infer Rest] ?
            Rest extends string[] ?
                [string, ..._EraseArrayConst<Rest>]
                : never 
            : never
    )

    export type ApplyIndexDefinition<T, Idx extends StoreIndexBase<T>> = {
        [K in keyof Idx]: Idx[K]
            // Idx[K] extends string?
            //         string :
            // Idx[K] extends string[] ?
            //         _EraseArrayConst<Idx[K]> : "Not_Matched"
    }

    type x = [1,2,3] extends [] ? true : false

    const createIndicesFor = <T>() => ({
        as: function<const Idx extends StoreIndexBase<T>>(idx: Idx): ApplyIndexDefinition<T, Idx> {
            return idx as ApplyIndexDefinition<T, Idx>
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
            property: string
            value: string[]
        }
        export function entityId(type: string, id: string, property: string): string {
            return `Prop_${type}_${id}_${property}`
        }
        export const entityIndices = createIndicesFor<EntityIndex>().as({
            entity: ["type", "id"],
            property: ["property", "value"]
        })

        // global
        export interface GlobalIndex {
            propertyCollection: string
            value: string
            counts: number
        }
        export function globalId(propertyCollection: string): string {
            return `GlobalProp_${propertyCollection}`
        }
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