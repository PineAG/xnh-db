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

        export type Options = {
            fullText: {
                tokenizer: DBTokenize.FuncTokenizer,
            },
            fullTextList: {
                tokenizer: DBTokenize.FuncTokenizer
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

    export type Entity<C extends ConfigBase> = {
        [K in keyof C]: (
            C[K] extends Field.Field<infer Type> ?
                Field.Payloads[Type] :
            C[K] extends ConfigBase ?
                Entity<C[K]> :
                never
        )
    }
}
