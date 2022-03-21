import { XNHImportedData } from "@xnh-db/types";
import { tokenizeDocument } from "@xnh-db/search";
import {dumpJSON, mkPath} from './utils'

import fs from 'fs'
import path from 'path'

type GlobalReverseIndex = Map<number, Map<string, {tfidf: number, documentId: string, type: string, title: string}[]>>
type TmpGlobalReverseIndex = Map<number, Map<string, {totalCount: number, nGramCount: number, documentId: string, type: string, title: string}[]>>

function generateGlobalReverseIndex(memoryDB: Map<string, XNHImportedData>, maxNGram: number): GlobalReverseIndex {
    const tmpIdx: TmpGlobalReverseIndex = new Map()
    for(let i=1; i<=maxNGram; i++){
        tmpIdx.set(i, new Map())
    }
    for(const doc of memoryDB.values()){
        const tokens = tokenizeDocument(doc.value.props, maxNGram, {})
        for(const [n, {total, nGrams}] of tokens){
            for(const [token, count] of Object.entries(nGrams)){
                const nGramSet = tmpIdx.get(n)
                if(!nGramSet.has(token)){
                    nGramSet.set(token, [])
                }
                nGramSet.get(token).push({totalCount: total, nGramCount: count, documentId: doc.id, type: doc.type, title: doc.title})
            }
        }
    }

    const globalReverseIndex: GlobalReverseIndex = new Map()
    for(const [n, grams] of tmpIdx){
        const newGram = new Map()
        globalReverseIndex.set(n, newGram)
        for(const [term, docs] of grams){
            newGram.set(term, docs.map(({totalCount, nGramCount, documentId, type, title}) => {
                const tf = nGramCount / totalCount
                const idf = Math.log10(memoryDB.size / docs.length)
                const tfidf = tf * idf
                return {
                    tfidf,
                    title,
                    documentId,
                    type
                }
            }))
        }
    }

    return globalReverseIndex
}

export async function generateSearchIndex(outputDir: string, memoryDB: Map<string, XNHImportedData>, maxNGram: number) {
    const globalReverseIndex = generateGlobalReverseIndex(memoryDB, maxNGram)
    for(const [n, grams] of globalReverseIndex){
        const nGramRoot = path.join(outputDir, `${n}_gram`)
        await mkPath(nGramRoot)
        for(const [token, docs] of grams){
            const fp = path.join(nGramRoot, `${token}.json`)
            dumpJSON(fp, docs)
        }
    }
}
