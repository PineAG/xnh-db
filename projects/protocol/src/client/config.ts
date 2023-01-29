export module FieldConfig {
    const ConfigIdentifier = Symbol()

    type ItemConfig<T, TypeStr extends string, Options> = {
        [ConfigIdentifier]: true,
        isArray: false,
        type: TypeStr,
        options: Options
    }

    type ArrayConfig<T, TypeStr extends string, Options> = {
        [ConfigIdentifier]: true,
        isArray: true,
        type: TypeStr,
        options: Options
    }

    export function isFieldConfig(obj: object): obj is FieldConfig {
        return obj && ConfigIdentifier in obj
    }

    export type IdFieldConfig = {
        [ConfigIdentifier]: true,
        type: "id"
    }
    export function id(): IdFieldConfig {
        return {
            [ConfigIdentifier]: true,
            type: "id"
        }
    }

    type FullTextOptions = {type: "fullText", weight: number}
    type TagOptions = {type: "tag", collection: string}

    export type FullTextFieldConfig = ItemConfig<string, "string", FullTextOptions>
    export function fullTextField(weight: number): FullTextFieldConfig {
        return {
            [ConfigIdentifier]: true,
            type: "string",
            isArray: false,
            options: {type: "fullText", weight}
        }
    }

    export type FullTextListConfig = ArrayConfig<string, "string", FullTextOptions>
    export function fullTextList(weight: number): FullTextListConfig {
        return {
            [ConfigIdentifier]: true,
            type: "string",
            isArray: true,
            options: {type: "fullText", weight}
        }
    }

    export type TagListConfig = ArrayConfig<string, "string", TagOptions>
    export function tagList(tagsCollection: string): TagListConfig {
        return {
            [ConfigIdentifier]: true,
            type: "string",
            isArray: true,
            options: {type: "tag", collection: tagsCollection}
        }
    }

    export type FileConfig = ItemConfig<string, "string", {type: "file"}>
    export function file(): FileConfig {
        return {
            [ConfigIdentifier]: true,
            type: "string",
            isArray: false,
            options: {type: "file"}
        }
    }

    export type FileListConfig = ArrayConfig<string, "string", {type: "file"}>
    export function fileList(): FileListConfig {
        return {
            [ConfigIdentifier]: true,
            type: "string",
            isArray: true,
            options: {type: "file"}
        }
    }


    type NumberOptions = {min: number, max: number, step: number, default: number}
    export type NumberConfig = ItemConfig<number, "number", NumberOptions>
    export function number(options: NumberOptions): NumberConfig {
        return {
            [ConfigIdentifier]: true,
            type: "number",
            isArray: false,
            options
        }
    }

    export type ConfigFromDeclaration<T> = {
        [K in keyof T]: (
            T[K] extends (infer U)[] ? (
                U extends string ?
                    StringListConfig:
                    never
            ) : (
                T[K] extends string ?
                    StringFieldConfig | IdFieldConfig :
                T[K] extends number ?
                    NumberConfig :
                T[K] extends Record<string, any> ?
                    ConfigFromDeclaration<T[K]>:
                    never
            )
        )
    }

    type StringListConfig = FullTextListConfig | TagListConfig | FileListConfig
    type StringFieldConfig = FullTextFieldConfig | FileConfig

    export type FieldConfig = IdFieldConfig | StringFieldConfig | NumberConfig | StringListConfig
}