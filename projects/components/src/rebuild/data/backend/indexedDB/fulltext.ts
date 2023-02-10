import { FieldConfig as FC } from "@xnh-db/protocol"
import { DeepPartial } from "utility-types"

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

export function extractFullTextTokensByConfig<T>(data: DeepPartial<T>, config: FC.ConfigFromDeclaration<T>): Record<string, number> {
    const result: Record<string, number> = {}
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

    function* walk(node: any, conf: any): Generator<[string, number]> {
        if(node === undefined) {
            return
        } else if(FC.Fields.isEndpointType(conf)) {
            if(conf.type === "fullText" && FC.isValidEndpointValue(conf, node)) {
                for(const t of tokenizeString(node)){
                    yield [t, conf.options.weight]
                }
            } else if (conf.type === "fullTextList" && FC.isValidEndpointValue(conf, node)) {
                for(const v of node){
                    for(const t of tokenizeString(v)){
                        yield [t, conf.options.weight]
                    }
                }
            }
        }else{
            for(const key of Object.keys(conf)) {
                yield* walk(node[key], conf[key])
            }
        }
    }
}
