import { FieldConfig, IOnlineClient, XnhDBProtocol } from "@xnh-db/protocol";
import { DeepPartial } from "utility-types";
import { BackendBase } from "./backend";

export async function getEntityParents(initialId: string, inheritanceClient: IOnlineClient.Relation<"parent" | "child", XnhDBProtocol.RelationPayloads.Inheritance>): Promise<string[]> {
    const result: string[] = []
    let id: string | undefined = await getParent(initialId)
    while(id !== undefined) {
        result.push(id)
        id = await getParent(id)
    }
    result.reverse()
    return result

    async function getParent(id: string): Promise<string | undefined> {
        const keys = await inheritanceClient.getRelationsByKey("child", initialId)
        if(keys.length === 0) {
            return undefined
        } else {
            return keys[0].parent
        }
    } 
}

export async function loadEntityWithInheritance<T>(id: string, config: FieldConfig.ConfigFromDeclaration<T>, collectionClient: IOnlineClient.Collection<T, BackendBase.Query>, inheritanceClient?: IOnlineClient.Relation<"parent" | "child", XnhDBProtocol.RelationPayloads.Inheritance>): Promise<DeepPartial<T>> {
    let parent: undefined | DeepPartial<T>
    if(inheritanceClient) {
        parent = {} as DeepPartial<T>
        const parents = await getEntityParents(id, inheritanceClient)
        for(const parentId of parents) {
            const p = await collectionClient.getItemById(parentId)
            parent = patchEntity(parent, p, config)
        }
    }
    let data = await collectionClient.getItemById(id)
    if(parent !== undefined) {
        data = patchEntity(parent, data, config)
    }
    return data
}

function patchEntity<T>(data: DeepPartial<T>, parent: DeepPartial<T>, config: FieldConfig.ConfigFromDeclaration<T>): DeepPartial<T> {
    return walk(data, parent, config)

    function walk(d: any, p: any, c: any): any {
        if(FieldConfig.Fields.isEndpointType(c)) {
            return d ?? p
        } else {
            const result = {}
            for(const key in c) {
                result[key] = walk(
                    d === undefined ? undefined : d[key],
                    p === undefined ? undefined : p[key],
                    c[key]
                )
            }
            return result
        }
    }
}
