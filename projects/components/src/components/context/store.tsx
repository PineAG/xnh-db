import { Octokit } from "@octokit/rest"
import { BackendConfigurationStore, DBSearchStore, IndexedDBBackend, StagingStore, SynchronizationStore } from "@xnh-db/core"
import {createContext, useCallback, useContext, useEffect, useMemo} from "react"
import { useLocalObservable } from "mobx-react-lite"
import { DBFileBackend } from "@xnh-db/common"

export module StoreContext {
    export const ConfigKey = "xnh-db.config"
    export const DBKey = "xnh-db"

    const FileBackendOptions: DBFileBackend.BackendOptions = {
        partitionPrefixLength: 2
    }

    interface ProviderProps {
        children: React.ReactNode
    }

    export module Sync {
        export const OctoKitContext = createContext<Octokit>(new Octokit())

        export const ConfigStoreContext = createContext<BackendConfigurationStore.ConfigStore>(new BackendConfigurationStore.ConfigStore(ConfigKey))

        export const SyncStoreContext = createContext<SynchronizationStore.Store>(new SynchronizationStore.Store())
    }

    export module Staging {
        function useIndexDBClient(dbName: string): Promise<IndexedDBBackend.ClientIDB> {
            const db = useMemo(() => {
                return IndexedDBBackend.open(dbName)
            }, [dbName])
            useEffect(() => () => {
                db.then(db => db.close())
            }, [dbName])

            return db
        }

        export function useStagingStore(): StagingStore.Store {
            const configStore = useContext(Sync.ConfigStoreContext)
            const upstreamFileBackend = configStore.currentBackend()
            const idbClient = useIndexDBClient(DBKey)
            
            return useLocalObservable(() => {
                const idbBackend = new IndexedDBBackend.Client(idbClient)
                const upstreamBackend = new DBFileBackend.ReadonlyBackend(upstreamFileBackend.backend, FileBackendOptions)
    
                return new StagingStore.Store({
                    backend: idbBackend,
                    fallbackBackend: upstreamBackend.reader()
                })
            })
        }
    }

    export module Search {
        const SearchContext = createContext<null | DBSearchStore.DataStore>(null)

        export function SearchProvider(props: ProviderProps) {
            const store = useLocalObservable(() => {
                const idbClient = IndexedDBBackend.open(DBKey)
                const idbBackend = new IndexedDBBackend.Client(idbClient)
                return new DBSearchStore.DataStore(idbBackend)
            })
    
            return <SearchContext.Provider value={store}>
                {props.children}
            </SearchContext.Provider>
        }
    
        export function useSearchResult(): DBSearchStore.DataStore {
            const store = useContext(SearchContext)
            if(!store) {
                throw new Error("Not in a SearchProvider")
            }
            return store
        }

        const EditContext = createContext<null | DBSearchStore.EditStore>(null)

        export function EditProvider(props: ProviderProps) {
            const store = useLocalObservable(() => {
                return new DBSearchStore.EditStore()
            })
    
            return <EditContext.Provider value={store}>
                {props.children}
            </EditContext.Provider>
        }
    
        export function useEdit(): DBSearchStore.EditStore {
            const store = useContext(EditContext)
            if(!store) {
                throw new Error("Not in a EditProvider")
            }
            return store
        }
    }

}