import { Octokit } from "@octokit/rest";
import { createNullableContext, Loading } from "@pltk/components";
import { IOfflineClient, IOfflineClientSet, IOnlineClient, IOnlineClientSet, RelationPayloads, synchronizeCollection, synchronizeRelation } from "@xnh-db/protocol";
import { useEffect, useState } from "react";
import { DeepPartial } from "utility-types";
import { IdbCollectionQuery } from "../../storage";
import { OctokitCertificationStore, OctokitClient } from "../../sync";
import { useDBClients, useSyncDialog } from "./globalSync";

type RelationsBase = Record<string, {payload: any, keys: string}>

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
        [K in keyof Relations]: IOnlineClient.Relation<Relations[K]["keys"], Relations[K]["payload"]>
    }
}

export interface ILocalSyncData<T, Relations extends RelationsBase> {
    item: DeepPartial<T>
    parent?: {
        id: string,
        data: DeepPartial<T>
    }
    relations: {
        [K in keyof Relations]: {
            keys: Record<Relations[K]["keys"], string>,
            payload: Relations[K]["payload"]
        }[]
    }
}

export interface ILocalSyncRequest<T, Relations extends RelationsBase> {
    item: DeepPartial<T>
    parentId?: string
    relations: {
        [K in keyof Relations]: {
            keys: Record<Relations[K]["keys"], string>,
            payload: Relations[K]["payload"]
        }[]
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

interface UseLocalSyncProps<T, R extends RelationsBase> {
    id: string
    offlineFactory: LocalSyncOfflineClientsFactory<T, R>
    onlineFactory: LocalSyncOnlineClientsFactory<T, R>
}

export type LocalSyncWrapperState<T, R extends RelationsBase> = {
    mode: "online"
    data: ILocalSyncData<T, R>
    update(data: ILocalSyncRequest<T, R>): Promise<void>
} | {
    mode: "offline"
    data: ILocalSyncData<T, R>
}

type UseLocalSyncResult<T, R extends RelationsBase> = {pending: true} | {pending: false, result: LocalSyncWrapperState<T, R>}

function useLocalSync<T, R extends RelationsBase>(props: UseLocalSyncProps<T, R>): UseLocalSyncResult<T, R> {
    const [result, setResult] = useState<UseLocalSyncResult<T, R>>({pending: true})
    const syncDialog = useSyncDialog()
    const clients = useDBClients()

    useEffect(() => {
        if(clients.mode === "online") {
            syncOnline()
        } else {
            syncOffline()
        }
    }, [clients.mode])

    return result

    async function syncOnline() {
        const localClients = props.offlineFactory(clients.local)
        const remoteClients = props.offlineFactory(clients.remote)
        await syncOfflineClients(syncDialog, remoteClients, localClients)
        await finalizeOnline()
    }

    async function update(req: ILocalSyncRequest<T, R>) {
        setResult({pending: true})
        
        const queryClients = props.onlineFactory(clients.query)
        const localClients = props.offlineFactory(clients.local)
        const remoteClients = props.offlineFactory(clients.remote)
        
        const oldData = await retrieveData(queryClients, props.id)

        await updateData(queryClients, props.id, oldData, req)
        const cert = OctokitCertificationStore.cert.get()
        if(!cert) {
            throw new Error("Cert not exist")
        }
        const octokit = new OctokitClient(cert.token)
        const branch = octokit.openBranchMaintenance(cert.repo)
        const backupCommit = await branch.getCommit()
        await updateData<T, R>(queryClients, props.id, oldData, req)
        OctokitCertificationStore.backupCommit.set(backupCommit)
        await syncOfflineClients(syncDialog, localClients, remoteClients)
        OctokitCertificationStore.backupCommit.clear()
        await finalizeOnline()
    }

    async function finalizeOnline() {
        const queryClients = props.onlineFactory(clients.query)
        const data = await retrieveData(queryClients, props.id)

        setResult({
            pending: false, 
            result: {
                mode: "online",
                data,
                update
            }
        })
    }

    async function syncOffline() {
        const queryClients = props.onlineFactory(clients.query)
        const data = await retrieveData(queryClients, props.id)
        setResult({
            pending: false, 
            result: {
                mode: "offline",
                data
            }
        })
    }
}

async function retrieveData<T, R extends RelationsBase>(clients: ILocalSyncOnlineClients<T, R>, id: string): Promise<ILocalSyncData<T, R>> {
    const item = await clients.collection.getItemById(id)
    let parent: ILocalSyncData<T, R>["parent"]
    
    if(clients.inheritance) {
        const parents = await clients.inheritance.getRelationsByKey("child", id)
        if(parents.length > 0) {
            const parentId = parents[0]["parent"]
            const parentData = await clients.collection.getItemById(parentId)
            parent = {
                id: parentId,
                data: parentData
            }
        } 
    }

    const relations: Partial<ILocalSyncData<T, R>["relations"]> = {}
    for(const k in clients.relations) {
        const rel = clients.relations[k]
        const keys = await rel.getRelationsByKey(k, id)
        relations[k] = await Promise.all(keys.map(async key => ({
            keys: key,
            payload: await rel.getPayload(key)
        })))
    }

    return {
        item,
        parent,
        relations: relations as ILocalSyncData<T, R>["relations"]
    }
}

async function updateData<T, R extends RelationsBase>(clients: ILocalSyncOnlineClients<T, R>, id: string, oldData: ILocalSyncData<T, R>, request: ILocalSyncRequest<T, R>): Promise<void> {
    await clients.collection.putItem(id, request.item)
    if(clients.inheritance) {
        const deletedKeys = await clients.inheritance.getRelationsByKey("child", id)
        await Promise.all(deletedKeys.map(k => clients.inheritance.deleteRelation(k)))
        if(request.parentId) {
            await clients.inheritance.putRelation({parent: request.parentId, child: id}, {})
        }
    }
    for(const relName in clients.relations) {
        const rel = clients.relations[relName]
        const currentKeys = await rel.getRelationsByKey(relName, id)
        await Promise.all(currentKeys.map(k => rel.deleteRelation(k)))
        for(const relReq of request.relations[relName]) {
            await rel.putRelation(relReq.keys, relReq.payload)
        }
    }
}

interface LocalSyncWrapperProps<T, R extends RelationsBase> extends UseLocalSyncProps<T, R> {
    children: React.ReactNode
}

const LocalSyncWrapperStateContext = createNullableContext<LocalSyncWrapperState<any, any>>("Local state not initialized")

export function LocalSyncWrapper<T, R extends RelationsBase>(props: LocalSyncWrapperProps<T, R>){
    const localSync = useLocalSync(props)
    if(localSync.pending === false) {
        return <LocalSyncWrapperStateContext.Provider value={localSync.result}>
            {props.children}
        </LocalSyncWrapperStateContext.Provider>
    } else {
        return <Loading/>
    }
}
