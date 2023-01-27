import {FieldConfig as FC} from "./config"

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
