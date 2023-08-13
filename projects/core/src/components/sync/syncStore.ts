import { DBClients } from "@xnh-db/common";
import { action, computed, makeAutoObservable, observable } from "mobx";

export module SynchronizationStore {

    export type UpstreamBackend = {
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

    export type DownstreamBackend = {
        reader: () => DBClients.FullSync.IReader,
        writer: () => DBClients.FullSync.IWriter
    }

    export interface BackendState {
        upstream: UpstreamBackend,
        downstream: DownstreamBackend
    }

    export type SyncState = {
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

        constructor() {
            makeAutoObservable(this)
        }

        // sync

        @computed get state() {
            return this.syncState
        }

        @action private setSyncState(syncState: SyncState) {
            this.syncState = syncState
        }

        async push(backend: BackendState) {
            if(this.syncState.status === "pulling" || this.syncState.status === "pushing") {
                throw new Error(`Attempting to push while ${this.syncState.status}`)
            }
            if(backend.upstream.type === "readonly") {
                throw new Error("Cannot push to readonly backend.")
            }
            const upstreamReader = backend.upstream.backend.reader()
            const upstreamWriter = backend.upstream.backend.writer()
            const downstreamReader = backend.downstream.reader()
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
            } catch (ex: any) {
                this.setSyncState({
                    status: "error",
                    action: "push",
                    message: ex.toString()
                })
            }
        }

        async pull(backend: BackendState) {
            if(this.syncState.status === "pulling" || this.syncState.status === "pushing") {
                throw new Error(`Attempting to pull while ${this.syncState.status}`)
            }
            const upstreamReader = backend.upstream.backend.reader()
            const downstreamReader = backend.downstream.reader()
            const downstreamWriter = backend.downstream.writer()
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
            } catch (ex: any) {
                this.setSyncState({
                    status: "error",
                    action: "pull",
                    message: ex.toString()
                })
            }
        }
    }
}
