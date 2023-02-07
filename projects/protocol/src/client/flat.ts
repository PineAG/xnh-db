import {FieldConfig as FC, FieldConfig} from "./config"
import {DeepPartial} from "utility-types"

export module ConfigFlatten {
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
    
    export function extractValuesAndConfigs<T>(data: DeepPartial<T>, definition: FC.ConfigFromDeclaration<T>): [any, FC.FieldConfig][] {
        return flattenByConfig({
            data,
            config: definition,
            mapper: it => it,
            child: (d, k, c) => d[k]
        }).map(([path, v, c]) => [v, c])
    }
    
    interface FlatByConfigProps<T, D, R, C extends FieldConfig.ConfigFromDeclaration<T>> {
        data: D
        config: C
        mapper: (item: any, config: FieldConfig.FieldConfig) => R
        child: (item: any, key: string, config: FieldConfig.FieldConfig) => D
    }
    
    export function flattenByConfig<T, D, R, C extends FieldConfig.ConfigFromDeclaration<T>>(props: FlatByConfigProps<T, D, R, C>): [string[], R, FieldConfig.FieldConfig][] {
        return Array.from(walk(props.data, props.config, []))
        
        function* walk(n: any, c: any, path: string[]): Generator<[string[], R, FieldConfig.FieldConfig]> {
            if(n === undefined || c === undefined) {
                return
            } else if (FieldConfig.isFieldConfig(c)) {
                yield [path, props.mapper(n, c), c]
            } else {
                for(const key in c) {
                    yield *walk(props.child(n, key, c), c[key], [...path, key])
                }
            }
    
        }
    }
}
