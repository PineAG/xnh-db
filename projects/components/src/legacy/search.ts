import { IOnlineClient } from "@xnh-db/protocol"
import { sortBy } from "lodash"
import { IdbCollectionQuery } from "./storage"

export module DBSearch {
    export async function search(query: IQuery, collection: IOnlineClient.Collection<any, IdbCollectionQuery>) {
        const results = await Operators.evaluate(query, collection)
        return sortBy(results, it => -it.weight)
    }

    export type IQueryDef = {
        "property": {
            type: "property"
            property: IdbCollectionQuery
        }
        "fullText": {
            type: "fullText"
            keyword: string
        }
        "merge": {
            type: "merge"
            operator: "and" | "or",
            children: IQuery[]
        }
        "exclude": {
            type: "exclude"
            children: [IQuery, IQuery]
        }
    }

    export type IQuery = {
        [K in keyof IQueryDef]: IQueryDef[K]
    }[keyof IQueryDef]

    export module Operators {
        
        export function and(children: IQuery[]): IQuery {
            return {
                type: "merge",
                operator: "and",
                children
            }
        }

        export function or(children: IQuery[]): IQuery {
            return {
                type: "merge",
                operator: "or",
                children
            }
        }

        export function exclude(children: [IQuery, IQuery]): IQuery {
            return {
                type: "exclude",
                children
            }
        }

        export function property(keyPath: string[], value: any): IQuery {
            return {
                type: "property",
                property: {keyPath, value}
            }
        }
        
        export function fullText(keyword: string): IQuery {
            return {
                type: "fullText",
                keyword
            }
        }
        
        export async function evaluate(operator: IQuery, collection: IOnlineClient.Collection<any, IdbCollectionQuery>): Promise<IOnlineClient.FullTextQueryResult[]> {
            const results = await internalEval(operator, collection)
            return Object.entries(results).map(([id, weight]) => ({id, weight}))
        }

        async function internalEval(operator: IQuery, collection: IOnlineClient.Collection<any, IdbCollectionQuery>): Promise<Record<string, number>> {
            switch(operator.type) {
                case "fullText": {
                    const results: Record<string, number> = {}
                    for(const {id, weight} of await collection.queryFullText(operator.keyword)) {
                        results[id] = weight
                    }
                    return results
                }
                case "property": {
                    const results: Record<string, number> = {}
                    for(const id of await collection.queryItems(operator.property)) {
                        results[id] = 0
                    }
                    return results
                }
                case "merge":
                    if(operator.children.length === 0) {
                        return {}
                    }
                    switch(operator.operator) {
                        case "and": {
                            const res = await Promise.all(operator.children.map(op => internalEval(op, collection)))
                            return res.reduce((left, right) => {
                                const results = {}
                                for(const key in left) {
                                    if(key in right) {
                                        results[key] = left[key] + right[key]
                                    }
                                }
                                return results
                            })
                        }
                        case "or": {
                            const res = await Promise.all(operator.children.map(op => internalEval(op, collection)))
                            return res.reduce((left, right) => {
                                const results = {...left}
                                for(const key in right) {
                                    results[key] = (results[key] ?? 0) + right[key]
                                }
                                return results
                            })
                        }
                    }
                case "exclude": {
                    const [left, right] = await Promise.all([
                        internalEval(operator.children[0], collection), 
                        internalEval(operator.children[1], collection)
                    ])
                    for(const key in right) {
                        delete left[key]
                    }
                    return left
                }
            }
        }
    } 
}