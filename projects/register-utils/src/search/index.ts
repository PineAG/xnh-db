export type XNHReverseIndex = Map<string, ReverseIndexTarget>

export interface ReverseIndexTarget {
    count: number
    documents: ReverseIndexDocument[]
}

export interface ReverseIndexDocument {
    id: string
    count: number
}

const delimiterRegex = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~\s]+/

function splitSentences(s: string): string[] {
    return s.split(delimiterRegex)
}

function* splitNGram(s: string, n: number): Generator<string> {
    if(n === 1){
        for(const term of s){
            yield term
        }
    }
    for (let i = 0; i <= s.length - n; i++) {
        yield s.slice(i, i + n)
    }
}

type DocBase = { [key: string]: string }
type DocWeight<T extends DocBase> = { [K in keyof T]?: number }
type TokenizedDoc = Map<number, { total: number, nGrams: { [key: string]: number } }>

export function tokenizeDocument<T extends DocBase, W extends DocWeight<T>>(doc: T, maxNGram: number, weights: W): TokenizedDoc {
    const result: TokenizedDoc = new Map()
    for (let  i= 1; i <= maxNGram; i++) {
        let totalCounter = 0
        const nGramCounter = {}
        for (const [k, v] of Object.entries(doc)) {
            const w = weights[k] ?? 1.0
            for (const sent of splitSentences(v)) {
                for (const iGram of splitNGram(sent, i)) {
                    totalCounter += w
                    nGramCounter[iGram] = (nGramCounter[iGram] ?? 0) + w
                }
            }
        }
        result.set(i, { total: totalCounter, nGrams: nGramCounter })
    }
    return result
}
