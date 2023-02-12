import { DbUiConfiguration } from "../config"
import { BackendBase, IndexedDBBackend, MemoryBackend, OctokitBackend, RestfulBackend } from "./backend"

export module DBStorage {
    type DPBase = DbUiConfiguration.DataPropsBase
    export type DBBackendSet<Props extends DPBase> = {
        query: BackendBase.OnlineClientSet<Props>,
        local: BackendBase.OfflineClientSet<Props>,
        remote: BackendBase.OfflineClientSet<Props>
    }

    export function createRestfulStorage<Props extends DPBase>(config: Props, dbName: string): DBBackendSet<Props> {
        const query = IndexedDBBackend.createOnlineClientSet(config, dbName)
        const local = IndexedDBBackend.createOfflineClientSet(config, dbName)
        const remote = RestfulBackend.createOfflineClientSet(config)
        return {query, local, remote}
    }

    export function createOctokitStorage<Props extends DPBase>(config: Props, dbName: string, cert: string, branch: OctokitBackend.OctokitResults.Branch): DBBackendSet<Props> {
        const query = IndexedDBBackend.createOnlineClientSet(config, dbName)
        const local = IndexedDBBackend.createOfflineClientSet(config, dbName)
        const remote = OctokitBackend.createOfflineClientSet(config, cert, branch)
        return {query, local, remote}
    }

    export function createMemoryStorage<Props extends DPBase>(config: Props, dbName: string): DBBackendSet<Props> {
        const query = IndexedDBBackend.createOnlineClientSet(config, dbName)
        const local = IndexedDBBackend.createOfflineClientSet(config, dbName)
        const remote = MemoryBackend.createOfflineClientSet(config)
        return {query, local, remote}
    }
}
