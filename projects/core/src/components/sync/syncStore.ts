import { DBClients } from "@xnh-db/common";
import { action, makeAutoObservable, observable } from "mobx";

export module SynchronizationStore {

    type UpstreamBackend = {
        type: "readonly",
        backend: {
            reader: () => DBClients.FullSync.IReader
        }
    } | {
        type: "readwrite",
        backend: {
            reader: () => DBClients.FullSync.IReader,
            writer: () => DBClients.FullSync.IWriter
        }
    }

    type DownstreamBackend = {
        reader: () => DBClients.FullSync.IReader,
        writer: () => DBClients.FullSync.IWriter
    }

    interface BackendState {
        upstream: UpstreamBackend,
        downstream: DownstreamBackend
    }

    type SyncState = {
        status: "unchecked"
    } | {
        status: "pushing",
        message: string,
    } | {
        status: "pulling",
        message: string
    } | {
        status: "stable"
    } | {
        status: "error",
        message: string,
        action: "push" | "pull"
    }

    export class Store {
        @observable private syncState: SyncState = {status: "unchecked"}
        @observable private backend: BackendState

        constructor(initialBackend: BackendState) {
            makeAutoObservable(this)
            this.backend = initialBackend
        }

        // backend
        @action setBackend(backend: BackendState) {
            if(this.syncState.status === "pulling" || this.syncState.status === "pushing") {
                throw new Error(`Attempting to switch backend while ${this.syncState.status}`)
            }
            this.backend = backend
            this.syncState = {status: "unchecked"}
        }

        // sync

        state() {
            return this.syncState
        }

        @action private setSyncState(syncState: SyncState) {
            this.syncState = syncState
        }

        async push() {
            if(this.syncState.status === "pulling" || this.syncState.status === "pushing") {
                throw new Error(`Attempting to push while ${this.syncState.status}`)
            }
            if(this.backend.upstream.type === "readonly") {
                throw new Error("Cannot push to readonly backend.")
            }
            const upstreamReader = this.backend.upstream.backend.reader()
            const upstreamWriter = this.backend.upstream.backend.writer()
            const downstreamReader = this.backend.downstream.reader()
            this.setSyncState({status: "pushing", message: "Start pushing..."})
            try {
                const actions = await DBClients.FullSync.Actions.extractActions(downstreamReader, upstreamReader)
                await upstreamWriter.performActions(actions, false, (message) => {
                    this.setSyncState({
                        status: "pushing",
                        message
                    })
                })
                this.setSyncState({status: "stable"})
            } catch (ex) {
                this.setSyncState({
                    status: "error",
                    action: "push",
                    message: ex.toString()
                })
            }
        }

        async pull() {
            if(this.syncState.status === "pulling" || this.syncState.status === "pushing") {
                throw new Error(`Attempting to pull while ${this.syncState.status}`)
            }
            const upstreamReader = this.backend.upstream.backend.reader()
            const downstreamReader = this.backend.downstream.reader()
            const downstreamWriter = this.backend.downstream.writer()
            this.setSyncState({status: "pushing", message: "Start pushing..."})
            try {
                const actions = await DBClients.FullSync.Actions.extractActions(upstreamReader, downstreamReader)
                await downstreamWriter.performActions(actions, false, (message) => {
                    this.setSyncState({
                        status: "pushing",
                        message
                    })
                })
                this.setSyncState({status: "stable"})
            } catch (ex) {
                this.setSyncState({
                    status: "error",
                    action: "pull",
                    message: ex.toString()
                })
            }
        }
    }
}
