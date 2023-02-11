import { FieldConfig, IOnlineClient } from "@xnh-db/protocol";
import { DeepPartial } from "utility-types";
import { BackendBase } from "./backend";

export module InheritanceUtils {
    type OnlineClient<T> = IOnlineClient.Collection<T, BackendBase.Query>
    export type InheritanceClient = BackendBase.InheritanceClient

    export async function* getParents(initialId: string, client: InheritanceClient): AsyncGenerator<string> {
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

    export async function* getAllChildren(initialId: string, client: InheritanceClient): AsyncGenerator<string> {
        const queue = await getChildrenInternal(initialId, client)
        while(queue.length > 0) {
            const id = queue.shift()
            yield id
            const children = await getChildrenInternal(id, client)
            queue.push(...children)
        }
    }

    async function getChildrenInternal(id: string, client: InheritanceClient): Promise<string[]> {
        const results = await client.getRelationsByKey("parent", id)
        return results.map(it => it.child)
    }

    export async function isValidateParentId(childId: string, parentId: string, client: InheritanceClient): Promise<boolean> {
        const queue = await getParentsInternal(parentId, client)
        while(queue.length > 0) {
            const id = queue.shift()
            if(id === childId) {
                return false
            }
            const parents = await getParentsInternal(id, client)
            queue.push(...parents)
        }
        return true
    }

    export function mergeEntities<T extends FieldConfig.EntityBase | FieldConfig.Fields.EndpointValueTypes>(parent: DeepPartial<T> | undefined, child: DeepPartial<T> | undefined, config: FieldConfig.ConfigFromDeclaration<T>): DeepPartial<T> | undefined {
        if(parent === undefined && child === undefined) {
            return undefined
        }else if(parent === undefined) {
            return child
        }else if(child === undefined) {
            return parent
        }else if(FieldConfig.Fields.isEndpointType(config)) {
            return child
        } else {
            const result: {[K in keyof T]?: DeepPartial<T[K]>} = {}
            for(const key in config) {
                result[key as string] = mergeEntities(parent[key as string], child[key as string], config[key])
            }
        }
    }

    export async function getParentEntity<T extends FieldConfig.EntityBase>(itemId: string, config: FieldConfig.ConfigFromDeclaration<T>, onlineClient: OnlineClient<T>, inheritanceClient: InheritanceClient): Promise<DeepPartial<T>> {
        const parents: DeepPartial<T>[] = []
        for await (const id of getParents(itemId, inheritanceClient)) {
            const item = await onlineClient.getItemById(id)
            parents.push(item)
        }
        parents.reverse()
        const item = await onlineClient.getItemById(itemId)
        const items = [...parents, item]
        return items.reduce((l, r) => mergeEntities<T>(l, r, config))
    }
}