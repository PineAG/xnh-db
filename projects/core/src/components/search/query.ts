import { DBClients, DBTokenize } from "@xnh-db/common"

export module DBSearch {
    export module Query {
        export enum Types {
            Property="property",
            FullText="fullText",
            Aggregate="aggregate",
            Infix="infix",
            Function="function"
        }

        export interface OptBase {
            Id: any
            Aggregates: string
            Infix: string
            Functions: {[key: string]: string}
        }

        export type Payloads<Opt extends OptBase> = {
            property: {property: string, value: string}
            fullText: {term: string}
            aggregate: {type: Opt["Aggregates"], children: QueryBase<Opt>[]}
            infix: {type: Opt["Infix"], left: QueryBase<Opt>, right: QueryBase<Opt>}
            function: FunctionPayload<Opt, keyof Opt["Functions"]>
        }

        interface FunctionPayload<Opt extends OptBase, Name extends keyof Opt["Functions"]> {
            name: Name,
            parameters: Partial<FunctionParams<Opt, Name>>
        }

        export type Query<N extends Types, Opt extends OptBase> = {
            type: N
            options: Payloads<Opt>[N]
        }

        export type QueryBase<Opt extends OptBase> = Query<Types, Opt>

        export interface Result<Id> {
            id: Id
            weight: number
        }

        export type FunctionParams<Opt extends OptBase, F extends keyof Opt["Functions"]> = {
            [K in Opt["Functions"][F]]: string
        }

        export interface IResolver<Opt extends OptBase> {
            readonly topAggregate: Opt["Aggregates"]
            validateAggregate(n: string): n is Opt["Aggregates"]
            validateInfix(n: string): n is Opt["Infix"]
            validateFunction(n: string): n is Extract<keyof Opt["Functions"], string>

            aggregate<Agg extends Opt["Aggregates"]>(name: Agg, children: Result<Opt["Id"]>[][]): Promise<Result<Opt["Id"]>[]>
            infix<Ifx extends Opt["Infix"]>(name: Ifx, left: Result<Opt["Id"]>[], right: Result<Opt["Id"]>[]): Promise<Result<Opt["Id"]>[]>
            functions(): {
                [F in keyof Opt["Functions"]]: (params: Partial<FunctionParams<Opt, F>>) => Promise<Result<Opt["Id"]>[]>
            }

            property(property: string, value: string): Promise<Result<Opt["Id"]>[]>
            fullText(term: string): Promise<Result<Opt["Id"]>[]>
        }

        export async function resolve<Opt extends OptBase>(
            resolver: IResolver<Opt>,
            query: QueryBase<Opt>
        ): Promise<Result<Opt["Id"]>[]> {
            if(isQueryOfType(Types.FullText, query)) {
                return resolver.fullText(query.options.term)
            } else if (isQueryOfType(Types.Property, query)) {
                return resolver.property(query.options.property, query.options.value)
            } else if (isQueryOfType(Types.Aggregate, query)) {
                const children: Result<Opt["Id"]>[][] = []
                for(const q of query.options.children) {
                    const res = await resolve(resolver, q)
                    children.push(res)
                }
                return await resolver.aggregate(query.type, children)
            } else if (isQueryOfType(Types.Infix, query)) {
                const left = await resolve(resolver, query.options.left)
                const right = await resolve(resolver, query.options.right)
                return await resolver.infix(query.options.type, left, right)
            } else if (isQueryOfType(Types.Function, query)) {
                const functions = resolver.functions()
                const fn = functions[query.options.name]
                return fn(query.options.parameters)
            } else {
                throw new Error(`Unknown type of query: ${query.type}`)
            }
        }

        function isQueryOfType<N extends Types, Opt extends OptBase>(type: N, obj: QueryBase<Opt>): obj is Query<N, Opt> {
            return obj.type === type
        }
    }

    export module Default {
        export type Id = {type: string, id: string}

        export type Result = Query.Result<Id>

        type Opt = {
            Id: Id
            Aggregates: "every" | "some"
            Infix: "and" | "or" | "exclude"
            Functions: Functions
        }

        type Functions = {
            linkTo: "id" | "type"
        }

        export interface IResolver extends Query.IResolver<Opt> {} 

        export class Resolver implements IResolver {
            readonly topAggregate: "every" | "some" = "every"

            constructor(private backend: DBClients.Query.IClient) {}
            
            validateAggregate(n: string): n is "every" | "some" {
                return n === "every" || n === "some"
            }
            validateInfix(n: string): n is "and" | "or" | "exclude" {
                return n === "and" || n === "or" || n === "exclude"
            }
            validateFunction(n: string): n is "linkTo" {
                return n === "linkTo"
            }

            async aggregate<Agg extends Opt["Aggregates"]>(name: Agg, children: Query.Result<Id>[][]): Promise<Query.Result<Id>[]> {
                if(children.length == 0) {
                    return []
                } else if (children.length === 1) {
                    return children[0]
                }

                if(name === "every") {
                    return children.reduce(AggResolver.intersection)
                } else if(name === "some") {
                    return children.reduce(AggResolver.union)
                } else {
                    throw new Error(`Invalid infix: ${name}`)
                }
            }
            async infix<Ifx extends Opt["Infix"]>(name: Ifx, left: Query.Result<Id>[], right: Query.Result<Id>[]): Promise<Query.Result<Id>[]> {
                if(name === "and") {
                    return AggResolver.intersection(left, right)
                } else if(name === "or") {
                    return AggResolver.union(left, right)
                } else if(name === "exclude") {
                    return AggResolver.exclude(left, right)
                } else {
                    throw new Error(`Invalid infix: ${name}`)
                }
            }
            
            functions(): { linkTo: (params: Partial<Query.FunctionParams<Opt, "linkTo">>) => Promise<Query.Result<Id>[]> } {
                return {
                    linkTo: async ({id, type}) => {
                        if(!id) {
                            throw new Error(`Missing id.`)
                        }
                        if(!type) {
                            throw new Error(`Missing type.`)
                        }
                        const result = await this.backend.getLinksOfEntity(type, id)
                        return result.map(it => ({
                            id: {type: it.opposite.type, id: it.opposite.id},
                            weight: 1.0
                        }))
                    }
                }
            }

            async property(property: string, value: string): Promise<Query.Result<Id>[]> {
                const pathMatch = property.match(/^\/(\w+)(\/.+?)$/)
                if(!pathMatch) {
                    throw new Error(`Invalid path format, expected '/<type>/<path>', got ${property}`)
                }
                const type = pathMatch[1]
                const path = pathMatch[2]

                const result = await this.backend.queryByTag(type, path, value)
                return result.map(it => ({
                    id: {
                        type: it.type,
                        id: it.id
                    },
                    weight: it.weight
                }))
            }
            async fullText(term: string): Promise<Query.Result<Id>[]> {
                const result = await this.backend.queryByFullTextTermGlobal(term)
                return result.map(it => ({
                    id: {
                        type: it.type,
                        id: it.id
                    },
                    weight: it.weight
                }))
            }
        }

        module AggResolver {
            export function union(left: Query.Result<Id>[], right: Query.Result<Id>[]): Query.Result<Id>[] {
                const leftMap = toMap(left)
                const rightMap = toMap(right)
                for(const [k, v] of Object.entries(rightMap)) {
                    const l = leftMap[k]
                    if(l) {
                        l.weight += v.weight
                    } else {
                        leftMap[k] = v
                    }
                }
                return Object.values(leftMap)
            }

            export function intersection(left: Query.Result<Id>[], right: Query.Result<Id>[]): Query.Result<Id>[] {
                const leftMap = toMap(left)
                const rightMap = toMap(right)
                for(const [k, v] of Object.entries(leftMap)) {
                    const r = rightMap[k]
                    if(r) {
                        v.weight += r.weight
                    } else {
                        delete leftMap[k]
                    }
                }
                return Object.values(leftMap)
            }

            export function exclude(left: Query.Result<Id>[], right: Query.Result<Id>[]): Query.Result<Id>[] {
                const leftMap = toMap(left)
                const rightMap = toMap(right)
                for(const k of Object.keys(rightMap)) {
                    delete leftMap[k]
                }
                return Object.values(leftMap)
            }

            function toMap(results: Query.Result<Id>[]): Record<string, Query.Result<Id>> {
                const out: Record<string, Query.Result<Id>> = {}
                for(const r of results) {
                    out[`${r.id.type}_${r.id.id}`] = r
                }
                return out
            }
        }
    }

    
}
