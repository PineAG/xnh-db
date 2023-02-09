import { FieldConfig } from "@xnh-db/protocol"

export module DbUiConfiguration {
    module InternalPropsUtil {
        export module TypeArgs {
            type _RequireType = any
            type _RequireKey = string
            type _RequireConfig<T> = FieldConfig.ConfigFromDeclaration<T>
            
            type CollectionValueBase = FieldConfig.EntityBase

            // One collection
            export type CollectionBase<V extends CollectionValueBase, Conf extends _RequireConfig<V>> = {
                value: V
                config: Conf
            } 

            // A set of collections
            export type CollectionSetBase = Record<_RequireKey, CollectionBase<_RequireType, _RequireType>>

            // One relation
            export type RelationBase<Collections extends CollectionSetBase, Payload> = {
                collections: Record<_RequireKey, keyof Collections>
                payload: Payload
                payloadConfig: _RequireConfig<Payload>
            }

            // A set of relations
            export type RelationSetBase<Collections extends CollectionSetBase> = Record<_RequireKey, RelationBase<Collections, _RequireType>>

            type TypeArgBase<C extends CollectionSetBase> = {
                collections: C
                relations: RelationSetBase<C>
            }

            export type TypeProps = TypeArgBase<CollectionSetBase>
        }
        
    }

    export type OptionsBase = InternalPropsUtil.OptionsBase

    export function makeConfig<Options extends OptionsBase>(props: InternalPropsUtil.Props<Options>): Readonly<InternalPropsUtil.Props<Options>> {
        return Object.freeze(props)
    }

    export module make {
        import FuncProps = InternalPropsUtil.FuncProps
        export function Collection<T extends FieldConfig.EntityBase, Props extends FuncProps.CollectionProps<any, any>>(props: Props): Props {
            return props
        }
    }
}
