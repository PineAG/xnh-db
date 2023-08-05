import { DBTokenize } from "./tokenize"

export module DBConfig {
    export module Field {
        export enum Types {
            FullText = "fullText",
            FullTextList = "fullTextList",
            TagList = "tagList",
            File = "file",
            FileList = "fileList",
        }

        export type Payloads = {
            fullText: string,
            fullTextList: string[],
            tagList: string[],
            file: string,
            fileList: string[]
        }

        export const defaultValues: {[K in Types]: () => Payloads[K]} = {
            fullText: () => "",
            fullTextList: () => [],
            tagList: () => [],
            file: () => "",
            fileList: () => []
        }

        export type Options = {
            fullText: {
                tokenizer: DBTokenize.FuncTokenizer,
                weight: number
            },
            fullTextList: {
                tokenizer: DBTokenize.FuncTokenizer
                weight: number
            },
            tagList: {
                tagCollection: string,
            },
            file: {
                fileCollection: string
            },
            fileList: {
                fileCollection: string
            }
        }

        export interface Field<Type extends Types> {
            $$field: symbol
            type: Type
            options: Options[Type]
        }

        const fieldMark = Symbol()

        export function field<Type extends Types>(type: Type, options: Options[Type]): Field<Type> {
            return {
                $$field: fieldMark,
                type,
                options
            }
        }

        export function isField(obj: any) : obj is Field<Types> {
            return obj && obj.$$field === fieldMark
        }

        export const payloadValidators: {[K in Types]: (value: {}) => value is Payloads[K]} = {
            fullText(v: {}): v is string { return typeof v === "string" },
            fullTextList(v: {}): v is string[] { return Array.isArray(v) },
            file(v: {}): v is string { return typeof v === "string" },
            fileList(v: {}): v is string[] { return Array.isArray(v) },
            tagList(v: {}): v is string[] { return Array.isArray(v) },
        }
    }

    import Types = Field.Types
    import Options = Field.Options

    export const Fields: {[t in Types]: (op: Options[t]) => Field.Field<t>} = {
        file: options => Field.field(Types.File, options),
        fileList: options => Field.field(Types.FileList, options),
        fullText: options => Field.field(Types.FullText, options),
        fullTextList: options => Field.field(Types.FullTextList, options),
        tagList: options => Field.field(Types.TagList, options)
    }

    export interface ConfigBase {
        [key: string]: ConfigBase | Field.Field<Types>
    }

    export function create<const C extends ConfigBase>(configBuilder: (f: typeof Fields) => C) {
        return configBuilder(Fields)
    }

    export type EvaluatedEntity<C extends ConfigBase> = {
        [K in keyof C]: (
            C[K] extends Field.Field<infer Type> ?
                Field.Payloads[Type] :
            C[K] extends ConfigBase ?
                EvaluatedEntity<C[K]> :
                never
        )
    }

    export type PartialEntity<C extends ConfigBase> = {
        [K in keyof C]?: (
            C[K] extends Field.Field<infer Type> ?
                Field.Payloads[Type]:
            C[K] extends ConfigBase ?
                EvaluatedEntity<C[K]> :
                never
        )
    }

    export type FillEndpoints<C extends ConfigBase, Endpoint> = {
        [K in keyof C]: (
            C[K] extends Field.Field<infer Type> ?
                Endpoint:
            C[K] extends ConfigBase ?
                FillEndpoints<C[K], Endpoint> :
                never
        )
    }

    export type MapEndpoints<C extends ConfigBase, Endpoints extends {[K in Types]: any}> = {
        [K in keyof C]: (
            C[K] extends Field.Field<infer Type> ?
                Endpoints[Type]:
            C[K] extends ConfigBase ?
                FillEndpoints<C[K], Endpoints> :
                never
        )
    }

    export module Convert {
        export type EntityPropertyItem = {propertyCollection: string, values: string[]}

        export function extractProperties<C extends ConfigBase>(config: C, entity: PartialEntity<C>): Record<string, EntityPropertyItem> {
            return Object.fromEntries(extractPropertyPairs(config, entity))
        }
    
        function* extractPropertyPairs<C extends ConfigBase>(config: C, entity: PartialEntity<C>): Generator<[string, EntityPropertyItem]> {
            for(const p of extractEntityValues(config, entity)) {
                if(isValuePackFor(Types.TagList, p)) {
                    yield [p.path, {propertyCollection: p.options.tagCollection, values: p.payload}]
                }
            }
        }
    
        export function extractFullTextTerms<C extends ConfigBase>(config: C, entity: PartialEntity<C>): DBTokenize.IToken[] {
            const result: Record<string, number> = {}
            for(const {value, weight} of extractFullTextTermPairs(config, entity)) {
                result[value] = (result[value] ?? 0) + weight
            }
            return Object.entries(result).map(([value, weight]) => ({value, weight}))
        }
    
        function* extractFullTextTermPairs<C extends ConfigBase>(config: C, entity: PartialEntity<C>): Generator<DBTokenize.IToken> {
            for(const p of extractEntityValues(config, entity)) {
                let results: string[]
                let tokenizer: DBTokenize.FuncTokenizer
                let weight: number
                if(isValuePackFor(Types.FullText, p)) {
                    results = [p.payload]
                    tokenizer = p.options.tokenizer
                    weight = p.options.weight
                } else if (isValuePackFor(Types.FullTextList, p)) {
                    results = p.payload
                    tokenizer = p.options.tokenizer
                    weight = p.options.weight
                } else {
                    continue
                }
                for(const v of results) {
                    for(const t of tokenizer(v)) {
                        yield {value: t.value, weight: t.weight * weight}
                    }
                }
            }
        }

        export function extractFileNames<C extends ConfigBase>(config: C, entity: PartialEntity<C>): string[] {
            const result = new Set<string>()
            for(const p of extractEntityValues(config, entity)) {
                if(isValuePackFor(Types.File, p)) {
                    result.add(p.payload)
                } else if (isValuePackFor(Types.FileList, p)) {
                    for(const v of p.payload) {
                        result.add(v)
                    }
                }
            }
            return Array.from(result)
        }

        export function mergeEntities<C extends ConfigBase>(config: C, lowerEntity: PartialEntity<C>, upperEntity: PartialEntity<C>): PartialEntity<C> {
            const result: PartialEntity<C> = {}
            for(const key in config) {
                const c = config[key]
                const lower = lowerEntity[key]
                const upper = upperEntity[key]
                if(Field.isField(c)) {
                    if(lower !== undefined && upper !== undefined) {
                        result[key] = upper
                    } else if (upper !== undefined) {
                        result[key] = upper
                    } else if (lower !== undefined) {
                        result[key] = lower
                    } else {
                        result[key] = undefined
                    }
                } else {
                    if(lower !== undefined && upper !== undefined) {
                        result[key] = mergeEntities(c, lower, upper) as any
                    } else if (upper !== undefined) {
                        result[key] = upper
                    } else if (lower !== undefined) {
                        result[key] = lower
                    }
                }
            }
            return result
        }
    
        interface ExtractedValuePack<Type extends Types> {
            path: string
            type: Type
            options: Field.Options[Type]
            payload: Field.Payloads[Type]
        }
    
        function isValuePackFor<Type extends Types>(type: Type, pack: ExtractedValuePack<Types>): pack is ExtractedValuePack<Type> {
            return pack.type === type
        }
    
        function* extractEntityValues<C extends ConfigBase>(config: C, entity: PartialEntity<C>, prefix: string = ""): Generator<ExtractedValuePack<Types>> {
            for(const key in config) {
                const p = `${prefix}/${key}`
                const c = config[key]
                if(Field.isField(c)) {
                    const v = entity[key]
                    if(v !== undefined) {
                        if(!Field.payloadValidators[c.type](v)) {
                            throw new Error(`Invalid payload ${v} for field ${p} ${c.type}`)
                        }
                        yield {
                            path: p,
                            type: c.type,
                            options: c.options,
                            payload: v as any
                        }
                    }
                } else {
                    const v = entity[key]
                    if(v != undefined) {
                        yield* extractEntityValues(c, v, p)
                    }
                }
            }
        }
    }
}
