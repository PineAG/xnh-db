import { createNullableContext, Loading } from "@pltk/components";
import { IOfflineClient, IOfflineClientSet, IOnlineClient, IOnlineClientSet, ProgressResult, RelationPayloads, synchronizeCollection, synchronizeRelation } from "@xnh-db/protocol";
import { createContext, useEffect, useState } from "react";
import { DeepPartial } from "utility-types";
import { IdbCollectionQuery } from "../../storage";
import { XBinding } from "./binding";
import { useDBClients, useSyncDialog } from "./globalSync";

type RelationsBase = Record<string, any>

export interface ILocalSyncOfflineClients<T, Relations extends RelationsBase> {
    collection: IOfflineClient.Collection<T>
    inheritance?: IOfflineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    relations: {
        [K in keyof Relations]: IOfflineClient.Relation<Extract<K, string>, Relations[K]>
    }
}

export interface ILocalSyncOnlineClients<T, Relations extends RelationsBase> {
    collection: IOnlineClient.Collection<T, IdbCollectionQuery>
    inheritance?: IOnlineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    relations: {
        [K in keyof Relations]: IOnlineClient.Relation<Extract<K, string>, Relations[K]>
    }
}

async function syncOfflineClients<T, R extends RelationsBase>(syncDialog: ReturnType<typeof useSyncDialog>, src: ILocalSyncOfflineClients<T, R>, dst: ILocalSyncOfflineClients<T, R>): Promise<void> {
    await syncDialog("数据集", synchronizeCollection(src.collection, dst.collection))
    if(src.inheritance && dst.inheritance) {
        await syncDialog("继承关系", synchronizeRelation(src.inheritance, dst.inheritance))
    }
    for(const k in src.relations) {
        const srcRel = src.relations[k]
        const dstRel = dst.relations[k]
        await syncDialog("关联记录", synchronizeRelation(srcRel, dstRel))
    }
}

type LocalSyncOnlineClientsFactory<T, R extends RelationsBase> = (clients: IOnlineClientSet<IdbCollectionQuery>) => ILocalSyncOnlineClients<T, R>
type LocalSyncOfflineClientsFactory<T, R extends RelationsBase> = (clients: IOfflineClientSet) => ILocalSyncOfflineClients<T, R>

type UseLocalSyncResult = {upload(): Promise<void>, state: "online"} | {state: "offline"} | {state: "pending"}

function useLocalSync<T, R extends RelationsBase>(offlineFactory: LocalSyncOfflineClientsFactory<T, R>, onlineFactory: LocalSyncOnlineClientsFactory<T, R>): UseLocalSyncResult {
    const [state, setState] = useState<UseLocalSyncResult>()
    const syncDialog = useSyncDialog()
    const clients = useDBClients()

    const localClients = offlineFactory(clients.local)
    const remoteClients = offlineFactory(clients.remote)
    const queryClients = onlineFactory(clients.query)

    useEffect(() => {
        if(clients.mode === "online") {
            syncOnline()
        } else {
            syncOffline()
        }
    }, [clients.mode])

    if(state === "online") {
        return {
            state,
            upload
        }
    } else {
        return {state}
    }

    async function syncOnline() {
        await syncOfflineClients(syncDialog, remoteClients, localClients)
        setState("online")
    }

    async function syncOffline() {
        setState("offline")
    }

    async function upload() {
        if(clients.mode === "offline") {
            console.warn("Upload in offline mode")
            return;
        }
        await syncOfflineClients(syncDialog, localClients, remoteClients)
    }
}

interface LocalSyncWrapperProps<T, R extends RelationsBase> {
    id: string
    onlineClientsFactory: LocalSyncOnlineClientsFactory<T, R>,
    offlineClientsFactory: LocalSyncOfflineClientsFactory<T, R>
    children: React.ReactNode
}

type LocalSyncResult<T> = {mode: "offline", value: T} | {mode: "online", binding: XBinding.Binding<T>}
const LocalSyncResultContext = createNullableContext<LocalSyncResult<any>>("Local state not initialized")
type LocalSyncWrapperState = {state: "pending"} | {state: "offline"} | {state: "online"}

export function LocalSyncWrapper<T, R extends RelationsBase>(props: LocalSyncWrapperProps<T, R>){
    const localSync = useLocalSync(props.offlineClientsFactory)
    const binding = XBinding.useBinding<DeepPartial<T>>({} as DeepPartial<T>)
    const clients = useDBClients()
    const onlineClients = props.onlineClientsFactory(clients.query)

    useEffect(() => {
        initialize()
    }, [localSync.state, props.id])

    if(localSync.state === "pending" || localPending) {
        return <Loading/>
    } else if (localSync.state === "offline") {
        return <LocalSyncResultContext.Provider value={{mode: "offline", value: binding.value}}>
            {props.children}
        </LocalSyncResultContext.Provider>
    } else if (localSync.state === "online") {
        return <LocalSyncResultContext.Provider value={{mode: "online", binding}}>
            {props.children}
        </LocalSyncResultContext.Provider>
    }

    async function initialize() {
        setLocalPending(true)

        setLocalPending(false)
    }
}



interface ILocalSyncQueryResult<T, Relations extends RelationsBase> {
    collection: DeepPartial<T>
    inheritance?: {
        parent: DeepPartial<T>
    }
    relations: {
        [K in keyof Relations]: IOnlineClient.Relation<Extract<K, string>, Relations[K]>
    }
}