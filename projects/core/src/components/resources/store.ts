import { IndexedDBBackend } from "@core/indexeddb"
import { ObservableMap, action, computed, makeAutoObservable, observable } from "mobx"

export module ResourceStore {
    export type AsyncResource<T> = {pending: true} | {pending: false, resource: T}

    type ResourcesBase = {[key: string]: any}

    type AsyncResources<Resources extends ResourcesBase> = {[K in keyof Resources]?: AsyncResource<Resources[K]>}

    export type StoreInitializers<Resources extends ResourcesBase> = {
        [K in keyof Resources]: () => Promise<Resources[K]>
    }

    export class Store<Resources extends ResourcesBase> {
        @observable resources: AsyncResources<Resources> = {}

        constructor(private initializers: StoreInitializers<Resources>) {
            makeAutoObservable(this)
        }

        @computed resource<Type extends keyof Resources>(type: Type): AsyncResource<Resources[Type]> {
            const current = this.resources[type]
            if(current) {
                return current
            } else {
                this.addResource(type)
                this.setResource(type, {pending: true})
                return {pending: true}
            }
        }

        private async addResource(type: keyof Resources) {
            const value = await this.initializers[type]()
            this.setResource(type, {pending: false, resource: value})
        }

        @action private setResource<Type extends keyof Resources>(type: Type, resource: AsyncResource<Resources[Type]>) {
            this.resources[type] = resource
        }
    }

    export function combine<R, T>(r: AsyncResource<T>, convertor: (value: T) => R): AsyncResource<R> {
        if(r.pending) {
            return r
        } else {
            return {pending: false, resource: convertor(r.resource)}
        }
    }
}
