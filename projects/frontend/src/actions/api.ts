import { XNHClasses } from '@xnh-db/types'
import axios from 'axios'
import LRUCache from'quick-lru'

const searchLRU = new LRUCache<string, SearchResult[]>({
    maxSize: 512
})

const MAX_N_GRAM = 10

export type SearchResult = {documentId: string, type: XNHClasses, tfidf: number, title: string}

export async function getSearchTerm(term: string): Promise<SearchResult[] | null> {
    if(term.length > MAX_N_GRAM){
        term = term.slice(0, MAX_N_GRAM)
    }
    const cache = searchLRU.get(term)
    if(cache !== undefined) return cache
    const res = await axios.get(`/data/search/${term.length}_gram/${term}.json`, {validateStatus: code => code === 404 || code === 200})
    const ret = res.status === 404 ? null : res.data
    searchLRU.set(term, ret)
    return ret
}

function* unionRightMapKeys<T>(left: Map<string, T>, right: Map<string, T>): Generator<string> {
    for(const key of left.keys()){
        if(right.has(key)){
            yield key
        }
    }
}

export async function searchByKeywords(keywords: string): Promise<SearchResult[]> {
    const terms = keywords.split(' ')
    const termResult = await Promise.all(terms.map(t => getSearchTerm(t)))
    const mappedResult = termResult.filter(t => t !== null).map(t => new Map(t?.map(x => [x.documentId, x])))
    if(mappedResult.length === 0) return []
    let currentResult = mappedResult[0]
    for(const nextTerm of mappedResult.slice(1, mappedResult.length)){
        const nextResult: typeof currentResult = new Map()
        for(const key of unionRightMapKeys(currentResult, nextTerm)){
            const left = currentResult.get(key)
            const right = nextTerm.get(key)
            if(left === undefined || right === undefined){
                throw new Error("WTF?")
            }
            const {tfidf: leftScore, ...rest} = left
            const {tfidf: rightScore} = right
            nextResult.set(key, {
                tfidf: leftScore + rightScore,
                ...rest
            })
        }
        currentResult = nextResult
    }
    return Array.from(currentResult.values()).sort(t => -t.tfidf)
}