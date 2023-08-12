import { action, computed, makeAutoObservable, observable } from "mobx";
import { DBSearch } from "./query";
import { DBClients } from "@xnh-db/common";
import { DBSearchExpression } from "./expression";

export module DBSearchStore {
    export class DataStore {
        @observable query: DBSearch.Default.DefaultQuery = DBSearch.Default.emptyQuery()
        @observable pending: boolean = false
        @observable results: DBSearch.Default.Result[] = []
        @observable errorMessage: string | null = null

        constructor(private backend: DBClients.Query.IClient) {
            makeAutoObservable(this)
        }

        async update(query: DBSearch.Default.DefaultQuery) {
            this.setPending(true)
            this.setQuery(query)
            const backend = this.backend
            const resolver = new DBSearch.Default.Resolver(backend)
            try {
                const result = await DBSearch.Query.resolve(resolver, query)
                this.setResults(result)
                this.setErrorMessage(null)
                this.setPending(false)
            } catch(ex) {
                this.setErrorMessage(ex.toString())
                this.setPending(false)
            }
        }

        @action private setErrorMessage(message: string | null) {
            this.errorMessage = message
        }

        @action private setQuery(query: DBSearch.Default.DefaultQuery) {
            this.query = query
        }

        @action private setPending(pending: boolean) {
            this.pending = pending
        }

        @action private setResults(results: DBSearch.Default.Result[]) {
            this.results = results
        }
    }

    export class EditStore {
        @observable queryContent: string = ""
        @observable queryObject: DBSearch.Default.DefaultQuery = DBSearch.Default.emptyQuery()
        @observable errorMessage: string | null = null

        private resolver = new DBSearch.Default.ExpressionResolver()

        constructor() {
            makeAutoObservable(this)
        }

        @computed get available() {
            return this.errorMessage === null
        }

        @action setQuery(content: string) {
            this.queryContent = content
            const result = DBSearchExpression.Parse.parse<DBSearch.Default.Opt>(content, this.resolver)
            if(result.success) {
                this.queryObject = result.query
                this.errorMessage = null
            } else {
                this.errorMessage = result.message
            }
        }
    }
}