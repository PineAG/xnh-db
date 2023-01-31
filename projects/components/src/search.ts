import { IOnlineClient } from "@xnh-db/protocol"
import { sortBy } from "lodash"
import { IdbCollectionQuery } from "./storage"

export module DBSearch {
    export interface IQuery {
        fullText: string[]
        property: IdbCollectionQuery[]
    }

    export function mergeQuery(left: IQuery, right: IQuery): IQuery {
        const fullText = [...left.fullText, ...right.fullText]
        const props: Record<string, IdbCollectionQuery> = {}
        for(const p of left.property) {
            props[p.keyPath.join(".")] = p
        }
        for(const p of right.property) {
            props[p.keyPath.join(".")] = p
        }
        const property = Array.from(Object.values(props))
        return {fullText, property}
    }

    export async function search(query: IQuery, collection: IOnlineClient.Collection<any, IdbCollectionQuery>) {
        const results: Record<string, number>[] = await Promise.all([
            ...query.fullText.map(async keyword => {
                return collection.queryFullText(keyword)
            }),
            ...query.property.map(async q => {
                const r = await collection.queryItems(q)
                const ans = {}
                for(const p of r) {
                    ans[p] = 0
                }
                return ans
            })
        ])

        if(results.length === 0) {
            return []
        }

        const finalResult: Record<string, number> = results.reduce((left, right) => {
            const r = {}
            for(const k in left){
                if(k in right) {
                    r[k] = left[k] + right[k]
                }
            }
            return r
        })
        const list: IOnlineClient.FullTextQueryResult[] = Object.entries(finalResult).map(([id, weight]) => ({id, weight}))
        return sortBy(list, it => -it.weight)
    }
}