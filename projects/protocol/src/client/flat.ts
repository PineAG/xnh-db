import {FieldConfig as FC, FieldConfig} from "./config"
import {DeepPartial} from "utility-types"

export module ConfigFlatten {
    export function flattenConfig<T, C extends FC.ConfigFromDeclaration<T>>(config: C): [string[], FieldConfig.Fields.FieldConfig][] {
        return flattenByConfig<T, true, true, C>({
            data: true,
            config: config,
            mapper: (it, c) => it,
            child: () => true
        }).map(([key, _, conf]) => [key, conf])
    }

    const FlattenDataMark = Symbol()
    export type FlattenedData<Conf> = Record<string, any> & {[FlattenDataMark]: Conf}
    
    export function flattenDataByConfig<T, C extends FC.ConfigFromDeclaration<T> = FC.ConfigFromDeclaration<T>>(data: DeepPartial<T>, definition: C): FlattenedData<C> {
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
        }))
        return {
            [FlattenDataMark]: definition,
            ...result
        }
    }
    
    export function extractFlatDataByConfig<T, C extends FC.ConfigFromDeclaration<T> = FC.ConfigFromDeclaration<T>>(data: FlattenedData<T>, definition: C): DeepPartial<T> {
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
    
    export function extractValuesAndConfigs<T>(data: DeepPartial<T>, definition: FC.ConfigFromDeclaration<T>): [string[], any, FieldConfig.Fields.FieldConfig][] {
        return flattenByConfig({
            data,
            config: definition,
            mapper: it => it,
            child: (d, k, c) => d[k]
        })
    }
    
    interface FlatByConfigProps<T, D, R, C extends FieldConfig.ConfigFromDeclaration<T>> {
        data: D
        config: C
        mapper: (item: any, config: FieldConfig.Fields.FieldConfig) => R
        child: (item: any, key: string, config: FieldConfig.Fields.FieldConfig) => D
    }
    
    export function flattenByConfig<T, D, R, C extends FieldConfig.ConfigFromDeclaration<T>>(props: FlatByConfigProps<T, D, R, C>): [string[], R, FieldConfig.Fields.FieldConfig][] {
        return Array.from(walk(props.data, props.config, []))
        
        function* walk(n: any, c: any, path: string[]): Generator<[string[], R, FieldConfig.Fields.FieldConfig]> {
            if(n === undefined || c === undefined) {
                return
            } else if (FieldConfig.Fields.isFieldConfig(c)) {
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
