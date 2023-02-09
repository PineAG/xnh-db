const ConfigEndpointIdentifier = Symbol()

export module FieldConfig {

    export interface EntityBase {
        [key: string]: Fields.EndpointValueTypes | EntityBase
    }

    export type AsEntity<T extends EntityBase> = T 

    export type EndpointConfig<T> = Fields.EndpointsOfValue<T>

    export type ConfigFromDeclaration<T> = (
        T extends Fields.EndpointValueTypes ? EndpointConfig<T> :
        T extends EntityBase ? {
            [K in keyof T]: ConfigFromDeclaration<T[K]>
        } :
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

        export type ValueType<Name extends keyof FieldTypesInternal> = FieldTypesInternal[Name]["data"]

        export function isEndpointType(obj: any): obj is EndpointTypes {
            return obj !== undefined && obj["$isField"] === ConfigEndpointIdentifier
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