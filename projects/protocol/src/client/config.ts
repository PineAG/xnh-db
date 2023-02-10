const ConfigEndpointIdentifier = Symbol()

export module FieldConfig {

    export interface EntityBase {
        [key: string]: Fields.EndpointValueTypes | EntityBase
    }

    export interface ConfigBase {
        [key: string]: Fields.EndpointTypes | ConfigBase
    }

    export type AsEntity<T extends EntityBase> = T 

    export type EndpointConfig<T> = Fields.EndpointsOfValue<T>

    export function isValidEndpointValue<C extends Fields.EndpointTypes>(config: C, value: any): value is Fields.ValueOfEndpoint[C["type"]] {
        return (
            ((config.type === "gallery" || config.type === "tagList" || config.type === "fullTextList") && Array.isArray(value)) ||
            ((config.type === "avatar" || config.type === "tag" || config.type === "fullText") && typeof value === "string") || 
            ((config.type === "number") && typeof value === "number")
            // Ignore type == "id"
        )
    }

    export type ConfigFromDeclaration<T> = (
        T extends Fields.EndpointValueTypes ? EndpointConfig<T> :
        T extends EntityBase ? {
            [K in keyof T]: ConfigFromDeclaration<T[K]>
        } :
        never
    )

    export type EntityFromConfig<C> = (
        C extends Fields.EndpointTypes ?
            Fields.ValueOfEndpoint[C["type"]] :
        C extends ConfigBase ?
            {[K in keyof C]: EntityFromConfig<C[K]>} :
            never
    )

    export const makeConfig = {
        for<T extends EntityBase>() {
            return {
                as<C extends ConfigFromDeclaration<T>>(conf: C): C {
                    return conf
                }
            }
        }
    }

    export module Fields {
        export module Options {
            export interface FullText {
                weight: number
            }
            export interface Tag {
                collection: string
            }
            export interface Number {
                min?: number
                max?: number
                step?: number
                default?: number
            }
            export interface File {}
        }

        type FieldTypesInternal = {
            id: {
                data: string,
                options: undefined
            }
            fullText: {
                data: string
                options: Options.FullText
            }
            fullTextList: {
                data: string[]
                options: Options.FullText
            }
            tag: {
                data: string
                options: Options.Tag
            }
            tagList: {
                data: string[]
                options: Options.Tag
            }
            number: {
                data: number
                options: Options.Number
            }
            avatar: {
                data: string
                options: Options.File
            }
            gallery: {
                data: string[]
                options: Options.File
            }
        }

        export type FieldTypes = {
            [K in keyof FieldTypesInternal]: {
                $isField: Symbol
                type: K
                options: FieldTypesInternal[K]["options"]
            }
        }

        export type EndpointTypes = FieldTypes[keyof FieldTypes]
        export type EndpointValueTypes = FieldTypesInternal[keyof FieldTypesInternal]["data"]
        export type EndpointsOfValue<V> = V extends EndpointValueTypes ? (
            Extract<EndpointTypes, {
                type: keyof Extract<FieldTypesInternal, {data: V}>
            }>
        ) : never
        export type ValueOfEndpoint = {
            [K in keyof FieldTypesInternal]: ValueType<K>
        }

        export type ValueType<Name extends keyof FieldTypesInternal> = FieldTypesInternal[Name]["data"]

        export function isEndpointType(obj: any): obj is EndpointTypes {
            return obj !== undefined && obj["$isField"] === ConfigEndpointIdentifier
        }

        export function isArrayEndpoint<C extends EndpointTypes>(conf: C): boolean {
            return conf.type === "fullTextList" || conf.type === "gallery" || conf.type === "tagList"
        }

        export function id(): FieldTypes["id"] {
            return {
                $isField: ConfigEndpointIdentifier,
                type: "id",
                options: undefined
            }
        }

        export function fullText(weight: number): FieldTypes["fullText"] {
            return {
                $isField: ConfigEndpointIdentifier,
                type: "fullText",
                options: {weight}
            }
        }

        export function fullTextList(weight: number): FieldTypes["fullTextList"] {
            return {
                $isField: ConfigEndpointIdentifier,
                type: "fullTextList",
                options: {weight}
            }
        }

        export function tag(collection: string): FieldTypes["tag"] {
            return {
                $isField: ConfigEndpointIdentifier,
                type: "tag",
                options: {collection}
            }
        }

        export function tagList(collection: string): FieldTypes["tagList"] {
            return {
                $isField: ConfigEndpointIdentifier,
                type: "tagList",
                options: {collection}
            }
        }

        export function number(options: Options.Number): FieldTypes["number"] {
            return {
                $isField: ConfigEndpointIdentifier,
                type: "number",
                options
            }
        }

        export function avatar(): FieldTypes["avatar"] {
            return {
                $isField: ConfigEndpointIdentifier,
                type: "avatar",
                options: {}
            }
        }

        export function gallery(): FieldTypes["gallery"] {
            return {
                $isField: ConfigEndpointIdentifier,
                type: "gallery",
                options: {}
            }
        }
    }
}