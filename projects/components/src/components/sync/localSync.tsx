import { createNullableContext, Loading, useNullableContext } from "@pltk/components";
import { FilesSynchronization, IOfflineClient, IOfflineClientSet, IOnlineClient, IOnlineClientSet, RelationPayloads, retrieveRemoteFile, synchronizeCollection, synchronizeRelation } from "@xnh-db/protocol";
import { useEffect, useState } from "react";
import { DeepPartial } from "utility-types";
import { IdbCollectionQuery } from "../../storage";
import { OctokitCertificationStore, OctokitClient } from "../../sync";
import { useDBClients, useSyncDialog } from "./globalSync";

export type LocalSyncRelationsBase = Record<string, {payload: any, keys: string}>
export type CreateLocalSyncRelations<C extends LocalSyncRelationsBase> = C

export interface ILocalSyncOfflineClients<T, Relations extends LocalSyncRelationsBase> {
    collection: IOfflineClient.Collection<T>
    inheritance?: IOfflineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    relations: {
        [K in keyof Relations]: IOfflineClient.Relation<Relations[K]["keys"], Relations[K]["payload"]>
    }
}

export interface ILocalSyncOnlineClients<T, Relations extends LocalSyncRelationsBase> {
    collection: IOnlineClient.Collection<T, IdbCollectionQuery>
    inheritance?: IOnlineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    relations: {
        [K in keyof Relations]: {
            selfKey: Relations[K]["keys"]
            targetKey: Relations[K]["keys"]
            client: IOnlineClient.Relation<Relations[K]["keys"], Relations[K]["payload"]>
        }
    }
}

export interface ILocalSyncData<T, Relations extends LocalSyncRelationsBase> {
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

export interface ILocalSyncRequest<T, Relations extends LocalSyncRelationsBase> {
    item: DeepPartial<T>
    parentId?: string
    relations: {
        [K in keyof Relations]: {
            keys: Record<Relations[K]["keys"], string>,
            payload: Relations[K]["payload"]
        }[]
    }
}

async function syncOfflineClients<T, R extends LocalSyncRelationsBase>(syncDialog: ReturnType<typeof useSyncDialog>, src: ILocalSyncOfflineClients<T, R>, dst: ILocalSyncOfflineClients<T, R>): Promise<void> {
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

type LocalSyncOnlineClientsFactory<T, R extends LocalSyncRelationsBase> = (clients: IOnlineClientSet<IdbCollectionQuery>) => ILocalSyncOnlineClients<T, R>
type LocalSyncOfflineClientsFactory<T, R extends LocalSyncRelationsBase> = (clients: IOfflineClientSet) => ILocalSyncOfflineClients<T, R>

interface UseLocalSyncProps<T, R extends LocalSyncRelationsBase> {
    id: string
    offlineFactory: LocalSyncOfflineClientsFactory<T, R>
    onlineFactory: LocalSyncOnlineClientsFactory<T, R>
}

export type LocalSyncWrapperState<T, R extends LocalSyncRelationsBase> = {
    mode: "online"
    data: ILocalSyncData<T, R>
    update(data: ILocalSyncRequest<T, R>): Promise<void>
    fetchFile(name: string): Promise<Blob>
} | {
    mode: "offline"
    data: ILocalSyncData<T, R>
    fetchFile(name: string): Promise<Blob>
}

type UseLocalSyncResult<T, R extends LocalSyncRelationsBase> = {pending: true} | {pending: false, result: LocalSyncWrapperState<T, R>}

function useLocalSync<T, R extends LocalSyncRelationsBase>(props: UseLocalSyncProps<T, R>): UseLocalSyncResult<T, R> {
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
        await _downloadFiles()
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
        await _uploadFiles()
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
                update,
                fetchFile
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
                data,
                fetchFile
            }
        })
    }

    async function _downloadFiles() {
        await syncDialog("下载文件索引", FilesSynchronization.download(clients.local.files, clients.remote.files))
    }

    async function _uploadFiles() {
        await syncDialog("上传文件", FilesSynchronization.upload(clients.local.files, clients.remote.files))
    }

    function fetchFile(name: string): Promise<Blob> {
        return retrieveRemoteFile(name, clients.query.files, clients.local.files, clients.remote.files)
    }
}

async function retrieveData<T, R extends LocalSyncRelationsBase>(clients: ILocalSyncOnlineClients<T, R>, id: string): Promise<ILocalSyncData<T, R>> {
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
        const {client, selfKey} = clients.relations[k]
        const keys = await client.getRelationsByKey(selfKey, id)
        relations[k] = await Promise.all(keys.map(async key => ({
            keys: key,
            payload: await client.getPayload(key)
        })))
    }

    return {
        item,
        parent,
        relations: relations as ILocalSyncData<T, R>["relations"]
    }
}

async function updateData<T, R extends LocalSyncRelationsBase>(clients: ILocalSyncOnlineClients<T, R>, id: string, oldData: ILocalSyncData<T, R>, request: ILocalSyncRequest<T, R>): Promise<void> {
    await clients.collection.putItem(id, request.item)
    if(clients.inheritance) {
        const deletedKeys = await clients.inheritance.getRelationsByKey("child", id)
        for(const k of deletedKeys) {
            await clients.inheritance.deleteRelation(k)
        }
        if(request.parentId) {
            await clients.inheritance.putRelation({parent: request.parentId, child: id}, {})
        }
    }
    for(const relName in clients.relations) {
        const {client, selfKey} = clients.relations[relName]
        const currentKeys = await client.getRelationsByKey(selfKey, id)
        for(const k of currentKeys) {
            await client.deleteRelation(k)
        }
        for(const relReq of request.relations[relName]) {
            await client.putRelation(relReq.keys, relReq.payload)
        }
    }
}

interface LocalSyncWrapperProps<T, R extends LocalSyncRelationsBase> extends UseLocalSyncProps<T, R> {
    children: React.ReactNode
}

const LocalSyncWrapperStateContext = createNullableContext<LocalSyncWrapperState<any, any>>("Local state not initialized")

export function LocalSyncWrapper<T, R extends LocalSyncRelationsBase>(props: LocalSyncWrapperProps<T, R>){
    const localSync = useLocalSync(props)
    if(localSync.pending === false) {
        return <LocalSyncWrapperStateContext.Provider value={localSync.result}>
            {props.children}
        </LocalSyncWrapperStateContext.Provider>
    } else {
        return <Loading/>
    }
}

export function useLocalSyncResult<T, R extends LocalSyncRelationsBase>(): LocalSyncWrapperState<T, R> {
    return useNullableContext(LocalSyncWrapperStateContext)
}


interface LocalSyncConsumerProps<T, R extends LocalSyncRelationsBase> extends UseLocalSyncProps<T, R> {
    children: (result: LocalSyncWrapperState<T, R>) => React.ReactNode
}

export function LocalSyncConsumer<T, R extends LocalSyncRelationsBase>(props: LocalSyncConsumerProps<T, R>): JSX.Element {
    const localSync = useLocalSync(props)
    if(localSync.pending === false) {
        return <>{props.children(localSync.result)}</>
    } else {
        return <Loading/>
    }
}