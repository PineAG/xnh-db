import { IOnlineClient } from "@xnh-db/protocol"
import { sortBy } from "lodash"
import { BackendBase } from "./backend"
import {InheritanceUtils} from "./inherit"

export module DBSearch {
    export async function search<Clients extends BackendBase.OnlineClientSet<any>>(clients: Clients, collectionName: keyof Clients["collections"], operator: IQuery) {
        const results = await Operators.evaluate(clients, collectionName, operator)
        return sortBy(results, it => -it.weight)
    }

    export type IQueryDef = {
        "property": {
            type: "property"
            property: BackendBase.Query
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
        
        export async function evaluate<Clients extends BackendBase.OnlineClientSet<any>>(clients: Clients, collectionName: keyof Clients["collections"], operator: IQuery): Promise<IOnlineClient.FullTextQueryResult[]> {
            const collection = clients.collections[collectionName]
            const inheritance = clients.inheritance[collectionName]
            const result = await internalEval(operator, {
                collection,
                inheritance
            })
            return Object.entries(result).map(([id, weight]) => ({id, weight}))
        }

        type InternalEvalContext = {
            collection: IOnlineClient.Collection<any, BackendBase.Query>, 
            inheritance: InheritanceUtils.InheritanceClient | undefined
        }

        async function internalEval(operator: IQuery, ctx: InternalEvalContext): Promise<Record<string, number>> {
            switch(operator.type) {
                case "fullText": {
                    const results: Record<string, number> = {}
                    for(const {id, weight} of await ctx.collection.queryFullText(operator.keyword)) {
                        results[id] = weight
                        if(ctx.inheritance) {
                            for await (const childId of InheritanceUtils.walkAllChildren(id, ctx.inheritance)) {
                                if(childId in results) {
                                    results[childId] = Math.max(results[childId], weight)    
                                } else {
                                    results[childId] = weight
                                }
                            }
                        }
                    }
                    return results
                }
                case "property": {
                    const results: Record<string, number> = {}
                    for(const id of await ctx.collection.queryItems(operator.property)) {
                        results[id] = 0
                        if(ctx.inheritance) {
                            for await (const childId of InheritanceUtils.walkAllChildren(id, ctx.inheritance)) {
                                results[childId] = 0
                            }
                        }
                    }
                    return results
                }
                case "merge":
                    if(operator.children.length === 0) {
                        return {}
                    }
                    switch(operator.operator) {
                        case "and": {
                            const res = await Promise.all(operator.children.map(op => internalEval(op, ctx)))
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
                            const res = await Promise.all(operator.children.map(op => internalEval(op, ctx)))
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
                        internalEval(operator.children[0], ctx), 
                        internalEval(operator.children[1], ctx)
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