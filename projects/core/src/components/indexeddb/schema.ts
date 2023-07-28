import { DBClients, DBTokenize } from "@xnh-db/common"
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

    export type StoreIndexBase<T extends {}> = {readonly [key: string]: keyof T}

    const createIndicesFor = <T extends {}>() => ({
        as: function<const Idx extends StoreIndexBase<T>>(idx: Idx): Idx {
            return idx
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
            // payload
            type: string
            id: string
            value: string
            propertyCollection: string,
            // index
            $entity: `${string}_${string}`
            $propertyValue: `${string}_${string}_${string}`
        }
        export function entityId(type: string, id: string, property: string): string {
            return `Prop_${type}_${id}_${property}`
        }
        export const entityIndices = createIndicesFor<EntityIndex>().as({
            entity: "$entity",
            property: "$propertyValue"
        })

        export function extractEntityIndices(type: string, id: string, properties: DBClients.Query.EntityProperties): EntityIndex[] {
            const result: EntityIndex[] = []
            for(const [propertyName, prop] of Object.entries(properties)) {
                for(const value of prop.values) {
                    result.push({
                        type, id, value,
                        propertyCollection: prop.propertyCollection,
                        $entity: `${type}_${id}`,
                        $propertyValue: `${type}_${propertyName}_${value}`
                    })
                }
            }
            return result
        }

        // global
        export interface GlobalIndex {
            propertyCollection: string
            value: string
            sum: number
        }
        export function globalId({propertyCollection, value}: GlobalIndex): string {
            return `GlobalProp_${propertyCollection}_${value}`
        }
        export function toAggregation(idx: EntityIndex): GlobalIndex {
            return {
                propertyCollection: idx.propertyCollection,
                value: idx.value,
                sum: 1,
            }
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
            $entity: `${string}_${string}`
            $collectionTerm: `${string}_${string}`
        }
        export function termId(type: string, id: string, term: string): string {
            return `Term_${type}_${id}_${term}`
        }
        export const termIndices = createIndicesFor<TermIndex>().as({
            entity: "$entity",
            globalTerm: "term",
            collectionTerm: "$collectionTerm"
        })

        export function extractTermIndices(type: string, id: string, fullTextTerms: DBTokenize.IToken[]): TermIndex[] {
            return fullTextTerms.map<TermIndex>(it => ({
                type, id,
                term: it.value,
                weight: it.weight,
                $entity: `${type}_${id}`,
                $collectionTerm: `${type}_${it.value}`
            }))
        }

        // entity
        export interface EntityIndex {
            type: string
            id: string
            totalWeight: number
        }
        export function entityId(type: string, id: string): string {
            return `Entity_${type}_${id}`
        }
        export const entityIndices = createIndicesFor<EntityIndex>().as({})
        
        // global
        export interface GlobalIndex {
            term: string
            sum: number
        }
        export function globalId({term}: GlobalIndex): string {
            return `GlobalTerm_${term}`
        }
        export function toGlobalAggregation(idx: TermIndex): GlobalIndex {
            return {
                term: idx.term,
                sum: idx.weight
            }
        }

        // collection
        export interface CollectionIndex {
            type: string
            term: string
            sum: number
        }
        export function collectionId({type, term}: CollectionIndex): string {
            return `CollectionTerm_${type}_${term}`
        }
        export const collectionIndices = createIndicesFor<CollectionIndex>().as({
            collection: "type"
        })
        export function toCollectionAggregation(idx: TermIndex): CollectionIndex {
            return {
                type: idx.type,
                term: idx.term,
                sum: idx.weight
            }
        }
    }

    export module Files {
        // content
        export type FileContent = DBClients.FileContent

        // meta -- aggregation
        export interface FileIndexOptions {
            name: string
            version: number
            status: DBClients.EntityState
            sum: number
            noReference: boolean
        }

        export interface FileIndex extends FileIndexOptions {
            $purging: `${string}_${boolean}`
        }
        export const fileIndices = createIndicesFor<FileIndex>().as({
            status: "status",
            purging: "$purging"
        })

        export function createFileIndex(options: FileIndexOptions): FileIndex {
            return {...options, $purging: `${options.status}_${options.noReference}`}
        }

        // entity
        export interface EntityIndex {
            type: string
            id: string
            fileName: string
            $entity: `${string}_${string}`
        }
        export function entityId(type: string, id: string, fileName: string): string {
            return `Files_${type}_${id}_${fileName}`
        }
        export const entityIndices = createIndicesFor<EntityIndex>().as({
            entity: "$entity",
            file: "fileName"
        })
        export function toEntityIndex(type: string, id: string, fileName: string): EntityIndex {
            return {
                type,
                id,
                fileName,
                $entity: `${type}_${id}`
            }
        }
    }

    export module Links {
        export type LinkItem = DBClients.Query.EntityLinkReference
        export type ClientLink = DBClients.Query.EntityLinkResult
        export type LinkRef = DBClients.Query.EntityLink

        // link item
        export interface BiLink {
            left: LinkItem
            right: LinkItem
        }
        
        export interface DBLink extends BiLink {
            version: number
            status: DBClients.EntityState
            $left: `${string}_${string}_${DBClients.EntityState}` // type, id, status
            $right: `${string}_${string}_${DBClients.EntityState}` // type, id, status
        }

        export function linkId(link: BiLink): string {
            return `Link_${link.left.referenceName}_${link.left.type}_${link.left.id}__${link.right.referenceName}_${link.right.type}_${link.right.id}`
        }

        export const linkIndices = createIndicesFor<DBLink>().as({
            left: "$left",
            right: "$right"
        })

        export function createLinkIndex(biLink: BiLink, version: number, status: DBClients.EntityState): DBLink {
            return {
                ...biLink,
                version, status, 
                $left: `${biLink.left.type}_${biLink.left.id}_${status}`,
                $right: `${biLink.right.type}_${biLink.right.id}_${status}`,
            }
        }

        // link name values
        export interface LinkNameIndex {
            leftType: string
            leftReferenceName: string
            rightType: string 
            rightReferenceName: string
            counts: number
            $leftRightType: `${string}_${string}`
        }

        export function referenceId(leftType: string, leftReferenceName: string, rightType: string, rightReferenceName: string): string {
            return `Ref_${leftType}_${leftReferenceName}__${rightType}_${rightReferenceName}`
        }

        export const referenceIndices = createIndicesFor<LinkNameIndex>().as({
            types: "$leftRightType"
        })

        // converts
        export function convertBiLinkToDBLink(biLink: BiLink, version: number, status: DBClients.EntityState): DBLink {
            return createLinkIndex(biLink, version, status)
        }

        export function convertDBLinkToBiLink(dbLink: DBLink): BiLink {
            return {
                left: dbLink.left,
                right: dbLink.right
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