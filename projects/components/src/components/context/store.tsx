import { Octokit } from "@octokit/rest"
import { BackendConfigurationStore, IndexedDBBackend, ResourceStore, StagingStore } from "@xnh-db/core"
import {createContext, useCallback, useContext} from "react"
import { useLocalObservable } from "mobx-react-lite"
import { DBFileBackend } from "@xnh-db/common"

export module StoreContext {
    export const ConfigKey = "xnh-db.config"
    export const DBKey = "xnh-db"

    const FileBackendOptions: DBFileBackend.BackendOptions = {
        partitionPrefixLength: 2
    }

    export const OctoKitContext = createContext<Octokit>(new Octokit())

    export const ConfigStoreContext = createContext<BackendConfigurationStore.ConfigStore>(new BackendConfigurationStore.ConfigStore(ConfigKey))
    export const GitHubConfigStoreContext = createContext<BackendConfigurationStore.GitHub.GitHubConfigStore>(new BackendConfigurationStore.GitHub.GitHubConfigStore())

    export function useStagingStore(): StagingStore.Store {
        const configStore = useContext(ConfigStoreContext)
        const upstreamFileBackend = configStore.currentBackend()
        
        return useLocalObservable(() => {
            const idbClient = IndexedDBBackend.open(DBKey)
            const idbBackend = new IndexedDBBackend.Client(idbClient)

            const upstreamBackend = new DBFileBackend.ReadonlyBackend(upstreamFileBackend.backend, FileBackendOptions)

            return new StagingStore.Store({
                backend: idbBackend,
                fallbackBackend: upstreamBackend.reader()
            })
        })
    }
}