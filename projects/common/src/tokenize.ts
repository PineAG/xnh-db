export module DBTokenize {
    export interface IToken {
        value: string,
        weight: number
    }

    export type FuncTokenizer = (content: string) => IToken[]

    export module Tokenizers {
        export function GeneralTokenizer(minLength: number, maxLength: number): FuncTokenizer {
            return content => Array.from(generallyTokenize(content, minLength, maxLength)).map(it => ({value: it, weight: 1.0}))
        }

        function* generallyTokenize(content: string, minLength: number, maxLength: number): Generator<string> {
            // TODO: Split by comma/space
            const n = Math.min(maxLength, content.length)
            for(let i=minLength; i<=n; i++) {
                yield* tokenizeByLength(content, i)
            }
        }

        function* tokenizeByLength(content: string, length: number): Generator<string> {
            const n = content.length
            for(let i=0; i<= n-length; i++) {
                yield content.slice(i, i+length)
            }
        }
    }
}
