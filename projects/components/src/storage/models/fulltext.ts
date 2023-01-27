import { ConfigFromDeclaration, isFieldConfig, number } from "@xnh-db/protocol/src/client/config"

const MAX_TOKEN_LENGTH = 20

export function* tokenizeStringByLength(s: string, length: number): Generator<string> {
    if(s.length <= length) {
        yield s
    }else{
        for(let i=0; i<=s.length - length; i++){
            yield s.slice(i, i+length)
        }
    }
}

export function* tokenizeString(s: string): Generator<string> {
    const maxLength = Math.min(MAX_TOKEN_LENGTH, s.length)
    for(let i=1; i<=maxLength; i++) {
        yield* tokenizeStringByLength(s, i)
    }
}

export function extractFullTextTokensByConfig<T>(data: T, config: ConfigFromDeclaration<T>): Record<string, number> {
    const result = {}
    let total = 0
    for(const [s, w] of walk(data, config)) {
        if(s in result) {
            result[s] += w
        } else {
            result[s] = w
        }
        total ++
    }
    if(total === 0) {
        return result
    }else {
        for(const key of Object.keys(result)) {
            result[key] /= total
        }
    }
    return result

    function* walk<V>(node: V, conf: ConfigFromDeclaration<V>): Generator<[string, number]> {
        if(node === undefined) {
            return
        } else if(isFieldConfig(conf)) {
            if(conf.type === "string" && conf.options.type === "fullText") {
                const values = (conf.isArray ? node : [node]) as string[]
                for(const v of values){
                    yield [v, conf.options.weight]
                }
            }
        }else{
            for(const key of Object.keys(conf)) {
                yield* walk(data[key], conf[key])
            }
        }
    }
}
