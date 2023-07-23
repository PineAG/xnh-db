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
        fullTextTerm: {
            key: string
            value: FullText.TermIndex,
            indexes: typeof FullText.termIndices
        }
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
            value: Blob,
            indexes: {}
        }

        // links
        links: {
            key: string,
            value: Links.DBLink,
            indexes: typeof Links.linkIndices
        }

        linksReferenceNames: {
            key: string,
            value: Links.LinkNameIndex,
            indexes: typeof Links.referenceIndices
        }
    }

    export type StoreIndexBase<T extends {}> = {readonly [key: string]: (keyof T) | readonly (keyof T)[]}

    type _EraseArrayConst<L extends readonly string[]> = (
        L extends readonly [] ? [] :
        L extends readonly [infer First, ...infer Rest] ?
            Rest extends readonly string[] ?
                [string | number | boolean, ..._EraseArrayConst<Rest>]
                : never 
            : never
    )

    export type ApplyIndexDefinition<Idx> = {
        -readonly [K in keyof Idx]:
            Idx[K] extends readonly string[] ?
                _EraseArrayConst<Idx[K]> :
                string | number | boolean
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
            property: ["type", "propertyName", "values"]
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
        // term
        export interface TermIndex {
            type: string
            id: string
            term: string
            weight: number
        }
        export function termId(type: string, id: string, term: string): string {
            return `Term_${type}_${id}_${term}`
        }
        export const termIndices = createIndicesFor<TermIndex>().as({
            entity: ["type", "id"],
            globalTerm: "term",
            collectionTerm: ["type", "term"]
        })

        // entity
        export interface EntityIndex {
            type: string
            id: string
            totalWeight: number
        }
        export function entityId(type: string, id: string): string {
            return `Entity_${type}_${id}`
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
        export interface FileIndex {
            name: string
            version: number
            status: DBClients.EntityState
            counts: number
            noReference: boolean
        }
        export const fileIndices = createIndicesFor<FileIndex>().as({
            status: "status",
            purging: ["status", "noReference"]
        })

        // entity
        export interface EntityIndex {
            type: string
            id: string
            fileName: string
        }
        export function entityId(type: string, id: string, fileName: string): string {
            return `Files_${type}_${id}_${fileName}`
        }
        export const entityIndices = createIndicesFor<EntityIndex>().as({
            entity: ["type", "id"],
            file: "fileName"
        })
    }

    export module Links {
        export type LinkItem = DBClients.Query.EntityLinkReference
        export type ClientLink = DBClients.Query.EntityLinkResult
        export type LinkRef = DBClients.Query.EntityLink

        export interface BiLink {
            left: LinkItem
            right: LinkItem
        }

        export interface DBLinkBase {
            leftReferenceName: string
            leftId: string
            leftType: string

            rightReferenceName: string
            rightId: string
            rightType: string
        }
        
        export interface DBLink extends DBLinkBase {
            version: number
            status: DBClients.EntityState
        }

        // link item
        export function linkId(link: DBLinkBase): string {
            return `Link_${link.leftReferenceName}_${link.leftType}_${link.leftId}__${link.rightReferenceName}_${link.rightType}_${link.rightId}`
        }

        export const linkIndices = createIndicesFor<DBLink>().as({
            left: ["leftType", "leftId", "status"],
            right: ["rightType", "rightId", "status"]
        })

        // link name values
        export interface LinkNameIndex {
            leftType: string
            leftReferenceName: string
            rightType: string 
            rightReferenceName: string
            counts: number
        }

        export function referenceId(leftType: string, leftReferenceName: string, rightType: string, rightReferenceName: string): string {
            return `Ref_${leftType}_${leftReferenceName}__${rightType}_${rightReferenceName}`
        }

        export const referenceIndices = createIndicesFor<LinkNameIndex>().as({
            types: ["leftType", "rightType"]
        })

        // converts
        export function convertBiLinkToDBLink(biLink: BiLink): DBLinkBase {
            return {
                leftId: biLink.left.id,
                leftType: biLink.left.type,
                leftReferenceName: biLink.left.referenceName,
                rightId: biLink.right.id,
                rightType: biLink.right.type,
                rightReferenceName: biLink.right.referenceName
            }
        }

        export function convertDBLinkToBiLink(dbLink: DBLinkBase): BiLink {
            return {
                left: {
                    id: dbLink.leftId,
                    type: dbLink.leftType,
                    referenceName: dbLink.leftReferenceName
                },
                right: {
                    id: dbLink.rightId,
                    type: dbLink.rightType,
                    referenceName: dbLink.rightReferenceName
                }
            }
        }

        export function createBiLink(left: LinkItem, right: LinkItem): BiLink {
            if(left.type <= right.type || left.type == right.type && left.referenceName <= right.referenceName) {
                return {
                    left: left,
                    right: right
                }
            } else {
                return {
                    left: right,
                    right: left
                }
            }
        }

        export function convertBiLinkToClientLink(entityType: string, entityId: string, biLink: BiLink): ClientLink {
            if(biLink.left.type === entityType && biLink.left.id === entityId) {
                return {
                    self: biLink.left,
                    opposite: biLink.right
                }
            } else if(biLink.right.type === entityType && biLink.right.id === entityId) {
                return {
                    self: biLink.right,
                    opposite: biLink.left
                }
            } else {
                throw new Error(`Invalid link for entity [${entityType}, ${entityId}]: left=[${biLink.left.type}, ${biLink.left.id}], right=[${biLink.right.type}, ${biLink.right.id}]`)
            }
        }
    }
}