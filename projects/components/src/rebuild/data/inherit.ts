import { FieldConfig, IOnlineClient } from "@xnh-db/protocol";
import { DeepPartial } from "utility-types";
import { DbUiConfiguration } from "../config";
import { BackendBase } from "./backend";

export module InheritanceUtils {
    type DPBase = DbUiConfiguration.DataPropsBase
    type OnlineClient<T> = IOnlineClient.Collection<T, BackendBase.Query>
    export type InheritanceClient = BackendBase.InheritanceClient

    export async function getParentId(itemId: string, client: InheritanceClient): Promise<string | null> {
        return getParentInternal(itemId, client)
    }

    export async function getParents(initialId: string, client: InheritanceClient): Promise<string[]> {
        const parents: string[] = []
        for await (const id of walkParents(initialId, client)) {
            parents.push(id)
        }
        parents.reverse()
        return parents
    }

    export async function* walkParents(initialId: string, client: InheritanceClient): AsyncGenerator<string> {
        let id = await getParentInternal(initialId, client)
        while(id !== null) {
            yield id
            id = await getParentInternal(id, client)
        }
    }

    async function getParentInternal(id: string, client: InheritanceClient): Promise<string | null> {
        const parents = await getParentsInternal(id, client)
        return parents.length === 0 ? null : parents[0]
    }

    async function getParentsInternal(id: string, client: InheritanceClient): Promise<string[]> {
        const parents = await client.getRelationsByKey("child", id)
        return parents.map(it => it.parent)
    }

    export async function* walkAllChildren(initialId: string, client: InheritanceClient): AsyncGenerator<string> {
        const queue = await getChildren(initialId, client)
        while(queue.length > 0) {
            const id = queue.shift()
            if(!id) break;
            yield id
            const children = await getChildren(id, client)
            queue.push(...children)
        }
    }

    export async function getChildren(id: string, client: InheritanceClient): Promise<string[]> {
        const results = await client.getRelationsByKey("parent", id)
        return results.map(it => it.child)
    }

    export async function isValidateParentId(childId: string, parentId: string, client: InheritanceClient): Promise<boolean> {
        const queue = await getParentsInternal(parentId, client)
        while(queue.length > 0) {
            const id = queue.shift()
            if(!id) break;
            if(id === childId) {
                return false
            }
            const parents = await getParentsInternal(id, client)
            queue.push(...parents)
        }
        return true
    }

    export function mergeEntities<T extends FieldConfig.EntityBase | FieldConfig.Fields.EndpointValueTypes>(parent: DeepPartial<T> | undefined, child: DeepPartial<T> | undefined, config: FieldConfig.ConfigFromDeclaration<T>): DeepPartial<T> | undefined {
        if(FieldConfig.Fields.isEndpointType(config)) {
            return isEmpty(child) ? parent : child
        } else {
            if(isEmpty(child)) {
                return parent
            }else if(parent && child) {    
                const result: {[K in keyof T]?: DeepPartial<T[K]>} = {}
                for(const key in config) {
                    result[key as string] = mergeEntities(parent[key as string], child[key as string], config[key])
                }
                return result as any
            } else {
                return child
            }
        }
    }

    function isEmpty(c: any): c is Exclude<any, undefined | null> {
        if(c === undefined || c === null) {
            return true
        }else if (typeof c === "string") {
            return c.length === 0
        }else if (Array.isArray(c)) {
            return c.length === 0
        } else {
            return false
        }
    }

    export async function getEntityPatchingParents<T extends FieldConfig.EntityBase>(itemId: string, config: FieldConfig.ConfigFromDeclaration<T>, onlineClient: OnlineClient<T>, inheritanceClient: InheritanceClient): Promise<DeepPartial<T>> {
        const parents: DeepPartial<T>[] = []
        for await (const id of walkParents(itemId, inheritanceClient)) {
            const item = await onlineClient.getItemById(id)
            parents.push(item)
        }
        parents.reverse()
        const item = await onlineClient.getItemById(itemId)
        const items = [...parents, item]
        let result: DeepPartial<T> | undefined = undefined
        for(const e of items) {
            result = mergeEntities(result, e, config)
        }
        console.log("INT", itemId, result)
        return result ?? {} as DeepPartial<T>
    }

    export type RelationQueryResult = {
        targetId: string
        payload: unknown
    }

    export async function getInheritedRelations<
        Props extends DPBase,
        CollectionName extends keyof Props["collections"],
        RelCollectionName extends keyof Props["collectionsToRelations"][CollectionName],
    > (
        config: Props,
        clients: BackendBase.OnlineClientSet<Props>,
        collectionName: CollectionName,
        relColName: RelCollectionName,
        initialItemId: string
    ): Promise<RelationQueryResult[]> {
        const result: Record<string, RelationQueryResult> = {}
        await updateAllRelationsInternal(config, clients, collectionName, relColName, initialItemId, result)
        const inheritClient = clients.inheritance[collectionName]
        if(inheritClient) {
            for await(const parentId of walkParents(initialItemId, inheritClient)) {
                await updateAllRelationsInternal(config, clients, collectionName, relColName, parentId, result)
            }
        }
        return Array.from(Object.values(result))
    }

    export async function getRelations<
        Props extends DPBase,
        CollectionName extends keyof Props["collections"],
        RelCollectionName extends keyof Props["collectionsToRelations"][CollectionName],
    > (
        config: Props,
        clients: BackendBase.OnlineClientSet<Props>,
        collectionName: CollectionName,
        relColName: RelCollectionName,
        itemId: string
    ): Promise<RelationQueryResult[]> {
        const result: Record<string, RelationQueryResult> = {}
        await updateAllRelationsInternal(config, clients, collectionName, relColName, itemId, result)
        return Array.from(Object.values(result))
    }

    async function updateAllRelationsInternal<
        Props extends DPBase,
        CollectionName extends keyof Props["collections"],
        RelCollectionName extends keyof Props["collectionsToRelations"][CollectionName],
    >(
        config: Props,
        clients: BackendBase.OnlineClientSet<Props>,
        collectionName: CollectionName,
        relColName: RelCollectionName,
        itemId: string,
        outData: Record<string, any>
    ): Promise<void> {
        const {selfKey, targetKey, relation: targetRel} = config.collectionsToRelations[collectionName][relColName]
        const relConfig = config.relations[targetRel]
        const targetColName = relConfig.collections[targetKey]
        
        const relClient = clients.relations[targetRel]
        const targetInheritClient = clients.inheritance[targetColName]
        
        const relationKeys = await relClient.getRelationsByKey(selfKey as any, itemId)
        
        for(const relKey of relationKeys) {
            const targetItemId = relKey[targetKey]
            if(targetItemId in outData) {
                continue
            }
            const payload = await relClient.getPayload(relKey)
            outData[targetItemId] = payload
            if(!targetInheritClient) {
                continue
            }
            for await (const childId of walkAllChildren(targetItemId, targetInheritClient)) {
                outData[childId] = payload
            }
        }
    }
}