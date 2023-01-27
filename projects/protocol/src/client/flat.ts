import {FieldConfig as FC} from "./config"
import {DeepPartial} from "utility-types"

export function flattenDataDefinition<T>(definition: FC.ConfigFromDeclaration<T>): [string[], FC.FieldConfig][] {
    function* walk(def: any, path: string[]): Generator<[string[], FC.FieldConfig]> {
        if(FC.isFieldConfig(def)) {
            yield [path, def]
        } else {
            for(const [k, v] of Object.entries(def)) {
                yield* walk(v, [...path, k])
            }
        }
    }
    return Array.from(walk(definition, []))
}

export function flattenDataByConfig<T>(data: DeepPartial<T>, definition: FC.ConfigFromDeclaration<T>): Record<string, any> {
    const result: any = {}
    for(const [keyPath, value] of walk(data, definition, [])) {
        result[keyPathToFlattenedKey(keyPath)] = value
    }
    return result


    function* walk(node: any, def: any, path: string[]): Generator<[string[], any]> {
        if(node === undefined){
            return
        }else if(FC.isFieldConfig(def)) {
            yield [path, node]
        } else {
            for(const [k, v] of Object.entries(def)) {
                yield* walk(node[k], v, [...path, k])
            }
        }
    }
}

export function extractFlatDataByConfig<T>(data: Record<string, any>, definition: FC.ConfigFromDeclaration<T>): DeepPartial<T> {
    const result: any = {}
    for(const [keyPath, conf] of flattenDataDefinition(definition)) {
        const flatPath = keyPathToFlattenedKey(keyPath)
        if(flatPath in data) {
            let n: any = result
            const parentKeys = keyPath.slice(0, keyPath.length - 1)
            const lastKey = keyPath[keyPath.length-1]
            for(let p of parentKeys) {
                if(p in n) {
                    n = n[p]
                } else {
                    n = n[p] = {}
                }
            }
            n[lastKey] = data[flatPath]
        }
    }
    return result
}

export function keyPathToFlattenedKey(keyPath: string[]): string {
    return keyPath.join("_")
}
