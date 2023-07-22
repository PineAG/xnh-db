import { DBTokenize } from "./tokenize"

export module DBSearch {
    export interface SearchResult {
        type: string
        id: string
        weight: string
    }

    export interface IBackend {
        queryByProperties(property: string[], value: string): Promise<SearchResult[]>
        queryByPropertiesInCollection(type: string, property: string[], value: string): Promise<SearchResult[]>
        queryByFullText(terms: DBTokenize.IToken[]): Promise<SearchResult[]>
        queryByFullTextInCollection(type: string, terms: DBTokenize.IToken[]): Promise<SearchResult[]>
    }

    export module Query {
        export interface IContext {
            collectionName: null | string
            backend: IBackend
        }

        export interface IQuery {
            evaluate(ctx: IContext): Promise<SearchResult[]>
            stringify(): string
        }

        export class PropertyQuery implements IQuery {
            constructor(private property: string[], private value: string) {}

            evaluate(ctx: IContext): Promise<SearchResult[]> {
                if(ctx.collectionName) {
                    return ctx.backend.queryByPropertiesInCollection(ctx.collectionName, this.property, this.value)
                } else {
                    return ctx.backend.queryByProperties(this.property, this.value)
                }
            }
            stringify(): string {
                throw new Error("Method not implemented.")
            }
        }

        export class FullTextQuery implements IQuery {
            constructor(private terms: DBTokenize.IToken[]) {}

            evaluate(ctx: IContext): Promise<SearchResult[]> {
                if(ctx.collectionName) {
                    return ctx.backend.queryByFullTextInCollection(ctx.collectionName, this.terms)
                } else {
                    return ctx.backend.queryByFullText(this.terms)
                }
            }
            stringify(): string {
                throw new Error("Method not implemented.")
            }
        }
    }
}
