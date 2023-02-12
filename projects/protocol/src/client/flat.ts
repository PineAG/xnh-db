import {FieldConfig as FC, FieldConfig} from "./config"
import {DeepPartial, UnionToIntersection} from "utility-types"

import EntityBase = FC.EntityBase

export module ConfigFlatten {
    export function flattenConfig<T extends EntityBase, C extends FC.ConfigFromDeclaration<T>>(config: C): [string[], FieldConfig.Fields.EndpointTypes][] {
        return flattenByConfig<T, true, true, C>({
            data: true,
            config: config,
            mapper: (it, c) => it,
            child: () => true
        }).map(([key, _, conf]) => [key, conf])
    }

    export module Flattened {
        type ConcatPrefix<L extends string | null, R extends string> = L extends null ? R : `${L}_${R}`

        type FlattenedInternal<T, Endpoint, Prefix extends string | null> = (
            T extends Endpoint ?
                {[K in Prefix]: T}:
                {
                    [K in Extract<keyof T, string>]: FlattenedInternal<T[K], Endpoint, ConcatPrefix<Prefix, K>>
                }[Extract<keyof T, string>]
        )

        type ExtractStringKeys<T> = {
            [K in Extract<keyof T, string>]: T[K]
        }

        export type Flattened<T, Endpoint> = ExtractStringKeys<UnionToIntersection<FlattenedInternal<T, Endpoint, null>>>
    }

    export type FlattenedEntity<T extends EntityBase> = Flattened.Flattened<T, FieldConfig.Fields.EndpointValueTypes>
    export type FlattenedConfig<T extends EntityBase, C extends FC.ConfigFromDeclaration<T>> = Flattened.Flattened<C, FieldConfig.Fields.EndpointTypes>
    
    export function flattenDataByConfig<T extends EntityBase, C extends FC.ConfigFromDeclaration<T> = FC.ConfigFromDeclaration<T>>(data: DeepPartial<T>, definition: C): FlattenedEntity<DeepPartial<T>> {
        const results = flattenByConfig({
            data: data,
            config: definition,
            mapper: (it, c) => it,
            child: (it, key, c) => it[key]
        })
        const result = Object.fromEntries(results.map(([keyPath, value, c]) => {
            return [
                stringifyKeyPath(keyPath),
                value
            ]
        })) as FlattenedEntity<DeepPartial<T>>
        return result
    }
    
    export function extractFlatDataByConfig<C extends FC.ConfigBase, T extends FC.EntityFromConfig<C>>(data: Partial<FlattenedEntity<T>>, definition: C): DeepPartial<T> {
        const result: any = {}
        for(const [keyPath, conf] of flattenConfig(definition)) {
            const flatPath = stringifyKeyPath(keyPath)
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
    
    export function stringifyKeyPath(keyPath: string[]): string {
        return keyPath.join("_")
    }
    
    export function extractValuesAndConfigs<T extends EntityBase>(data: DeepPartial<T>, definition: FC.ConfigFromDeclaration<T>): [string[], any, FieldConfig.Fields.EndpointTypes][] {
        return flattenByConfig({
            data,
            config: definition,
            mapper: it => it,
            child: (d, k, c) => d[k]
        })
    }
    
    interface FlatByConfigProps<T extends FieldConfig.EntityBase, D, R, C extends FieldConfig.ConfigFromDeclaration<T>> {
        data: D
        config: C
        mapper: (item: any, config: FieldConfig.Fields.EndpointTypes) => R
        child: (item: any, key: string, config: FieldConfig.Fields.EndpointTypes) => D
    }
    
    export function flattenByConfig<T extends EntityBase, D, R, C extends FieldConfig.ConfigFromDeclaration<T>>(props: FlatByConfigProps<T, D, R, C>): [string[], R, FieldConfig.Fields.EndpointTypes][] {
        return Array.from(walk(props.data, props.config, []))
        
        function* walk(n: any, c: any, path: string[]): Generator<[string[], R, FieldConfig.Fields.EndpointTypes]> {
            if(n === undefined || c === undefined) {
                return
            } else if (FieldConfig.Fields.isEndpointType(c)) {
                yield [path, props.mapper(n, c), c]
            } else {
                for(const key in c) {
                    yield *walk(props.child(n, key, c), c[key], [...path, key])
                }
            }
        }
    }

    export function extractValueByKeyPath(keyPath: string[], data: any): any {
        let n = data
        for(const k of keyPath) {
            if(n === undefined) {
                break
            }
            n = n[k]
        }
        return n
    }
}
