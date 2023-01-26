
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

export type IdFieldConfig = {
    [ConfigIdentifier]: true,
    type: "id"
}

export type StringFieldConfig = ItemConfig<string, "string", {fullText: true}>
export type StringListConfig = ArrayConfig<string, "string", {tagsCollection: string} | {fullText: true}>
export type NumberFieldConfig = ItemConfig<number, "number", undefined>

export type FieldConfig = IdFieldConfig | StringFieldConfig | StringListConfig | NumberFieldConfig

export function isFieldConfig(obj: object): obj is FieldConfig {
    return ConfigIdentifier in obj
}

export function id(): IdFieldConfig {
    return {
        [ConfigIdentifier]: true,
        type: "id"
    }
}
export function fullTextField(): StringFieldConfig {
    return {
        [ConfigIdentifier]: true,
        type: "string",
        isArray: false,
        options: {fullText: true}
    }
}
export function fullTextList(): StringListConfig {
    return {
        [ConfigIdentifier]: true,
        type: "string",
        isArray: true,
        options: {fullText: true}
    }
}
export function tagList(tagsCollection: string): StringListConfig {
    return {
        [ConfigIdentifier]: true,
        type: "string",
        isArray: true,
        options: {tagsCollection}
    }
}
export function number(): NumberFieldConfig {
    return {
        [ConfigIdentifier]: true,
        type: "number",
        isArray: false,
        options: undefined
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
                NumberFieldConfig :
            T[K] extends Record<string, any> ?
                ConfigFromDeclaration<T[K]>:
                never
        )
    )
}
