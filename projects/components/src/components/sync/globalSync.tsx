import { IOfflineClient, IOfflineClientSet, IOnlineClientSet, PathSyncClient, XNH_DB_DATA_VERSION } from "@xnh-db/protocol";
import React, { useEffect, useState, version } from "react";
import { createRestfulOfflineClientsSet } from "../../restful";
import { createIdbClients, destroyIdbStorage, IdbCollectionQuery } from "../../storage";
import { stringifyProgressResult, synchronizeOfflineClientSet } from "../../storage/models/data";
import { createOctokitOfflineClientSet, OctokitCertificationStore, OctokitClient } from "../../sync";
import {message, Modal} from "antd"
import { createNullableContext } from "@pltk/components";

type ForceProceedingAction = {proceed: () => Promise<void>}
type CancelableAction = {proceed: () => Promise<void>, cancel: () => Promise<void>}
type InitializedClients = {query: IOnlineClientSet<IdbCollectionQuery>, local: IOfflineClientSet, remote: IOfflineClientSet}

type DataSynchronizationGlobalState = {
    "pending": {message: string[]},
    "auth_required": {
        proceed: (cert: OctokitCertificationStore.IGithubCert) => Promise<void>
        cancel: () => Promise<void>
    },
    "low_version": ForceProceedingAction,
    "broken_remote": ForceProceedingAction,
    "fetal": {message: string},
    "online": InitializedClients,
    "offline": InitializedClients
}

type DataSynchronizationGlobalResults = {
    [K in keyof DataSynchronizationGlobalState]: {
        type: K,
        actions: DataSynchronizationGlobalState[K]
    }
}[keyof DataSynchronizationGlobalState]

function useDataSynchronizationGlobal(): DataSynchronizationGlobalResults {
    const [state, setState] = useState<keyof DataSynchronizationGlobalState>("pending")
    const [message, setMessage] = useState<string[]>([])
    const [fetalMessage, setFetalMessage] = useState<string>("")

    const [clients, setClients] = useState<null | InitializedClients>(null)

    useEffect(() => {
        initialize()
    }, [])

    if(state === "low_version") {
        return {
            type: "low_version",
            actions: {
                proceed: fixLowVersion
            }
        }
    } else if (state === "broken_remote") {
        return {
            type: "broken_remote",
            actions: {
                proceed: fixBrokenRemote
            }
        }
    } else if (state === "pending") {
        return {
            type: "pending",
            actions: {
                message
            }
        }
    } else if (state === "fetal") {
        return {
            type: "fetal",
            actions: {
                message: fetalMessage
            }
        }
    } else if (state === "auth_required") {
        return {
            type: "auth_required",
            actions: {
                proceed: authorize,
                cancel: switchToOffline
            }
        }
    } else {
        if(!clients) {
            throw new Error("Invalid State")
        }
        return {
            type: state,
            actions: clients
        }
    } 

    async function initialize() {
        setMessage(["正在检查同步状态..."])
        setState("pending")
        try {
            const cert = OctokitCertificationStore.cert.get()
            const version = OctokitCertificationStore.version.get()
            let state: keyof DataSynchronizationGlobalState
            if(cert) { // online
                setMessage(["正在校验登陆凭证..."])
                const validCert = await _checkCert(cert)
                if(!validCert) {
                    state = "auth_required"
                } else {
                    const commit = OctokitCertificationStore.backupCommit.get()
                    if(commit) {
                        state = "broken_remote"
                    } else {
                        await _syncOctokit(["正在同步数据...", "首次同步可能花费较长时间"], cert)
                        state = "online"
                        setMessage(["准备本地数据库"])
                        const localClients = await createIdbClients()
                        setClients({
                            query: localClients.online,
                            local: localClients.offline, 
                            remote: createOctokitOfflineClientSet(cert)
                        })
                    }
                }
            } else { // offline
                if(version !== XNH_DB_DATA_VERSION) {
                    await destroyIdbStorage()
                    await _syncRestful(["版本不一致, 正在重新同步...", "可能花费较长时间"])
                    OctokitCertificationStore.version.set(XNH_DB_DATA_VERSION)
                } else {
                    await _syncRestful(["正在同步..."])
                }
                state = "offline"
                setMessage(["准备本地数据库"])
                const localClients = await createIdbClients()
                setClients({
                    query: localClients.online,
                    local: localClients.offline, 
                    remote: createRestfulOfflineClientsSet()
                })
            }
            setState(state)
        }catch(e) {
            setFetalMessage(e.toString())
            setState("fetal")
        }
    }

    async function _checkCert(cert: OctokitCertificationStore.IGithubCert): Promise<boolean> {
        const client = new OctokitClient(cert.token)
        try {
            await client.getRepos()
            return true
        }catch(e) {
            return false
        }
    }

    async function _syncOctokit(prefixMessages: string[], cert: OctokitCertificationStore.IGithubCert) {
        const octokitClient = createOctokitOfflineClientSet(cert)
        await _sync(prefixMessages, octokitClient)
    }

    async function _syncRestful(prefixMessages: string[]) {
        const restfulClient = createRestfulOfflineClientsSet()
        await _sync(prefixMessages, restfulClient)
    }

    async function _sync(prefixMessages: string[], remoteClients: IOfflineClientSet) {
        setMessage([...prefixMessages, "准备本地数据库"])
        const {offline: localClients} = await createIdbClients()
        for await(const [itemType, progress] of synchronizeOfflineClientSet(remoteClients, localClients)) {
            setMessage([
                ...prefixMessages,
                `正在更新 ${itemType.type === "collection" ? "条目集" : "关系集"}: ${itemType.name}`,
                stringifyProgressResult(progress)
            ])
        }
    }

    async function _reverseSync(prefixMessages: string[]) {
        const cert = OctokitCertificationStore.cert.get()
        if(!cert) {
            throw new Error("Invalid state")
        }
        const remoteClients = createOctokitOfflineClientSet(cert)
        setMessage([...prefixMessages, "准备本地数据库"])
        const {offline: localClients} = await createIdbClients()
        for await(const [itemType, progress] of synchronizeOfflineClientSet(localClients, remoteClients)) {
            setMessage([
                ...prefixMessages,
                `正在更新 ${itemType.type === "collection" ? "条目集" : "关系集"}: ${itemType.name}`,
                stringifyProgressResult(progress)
            ])
        }
    }


    async function switchToOffline() {
        setMessage([])
        setState("pending")
        try {
            OctokitCertificationStore.clear()
            await destroyIdbStorage()
            await initialize()
        }catch(e) {
            setFetalMessage(e.toString())
            setState("fetal")
        }
    }

    async function fixBrokenRemote() {
        setMessage([])
        setState("pending")
        try {
            const cert = OctokitCertificationStore.cert.get()
            if(!cert) {
                throw new Error("Cannot fix remote in offline mode.")
            }
            const client = new OctokitClient(cert.token)
            const branch = client.openBranchMaintenance(cert.repo)
            
            const commit = OctokitCertificationStore.backupCommit.get()
            if(!commit) {
                throw new Error("Nothing to fix")
            }
            setMessage(["正在重置远程数据库"])
            await branch.rollback(commit)

            await _reverseSync(["正在重新同步到远程数据库..."])
            OctokitCertificationStore.backupCommit.clear()

            setMessage(["准备本地数据库"])
            const localClients = await createIdbClients()
            setClients({
                query: localClients.online,
                local: localClients.offline, 
                remote: createOctokitOfflineClientSet(cert)
            })
            setState("online")
        }catch(e) {
            setFetalMessage(e.toString())
            setState("fetal")
        }
    }

    async function fixLowVersion() {
        setMessage([])
        setState("pending")
        try {
            await destroyIdbStorage()
            OctokitCertificationStore.version.set(XNH_DB_DATA_VERSION)
            await initialize()
        }catch(e) {
            setFetalMessage(e.toString())
            setState("fetal")
        }
    }

    async function authorize(cert: OctokitCertificationStore.IGithubCert) {
        setMessage([])
        setState("pending")
        try {
            OctokitCertificationStore.cert.set(cert)
            await initialize()
        }catch(e) {
            setFetalMessage(e.toString())
            setState("fetal")
        }
    }
}

export interface IGlobalClients {
    mode: "online" | "offline"
    query: IOnlineClientSet<IdbCollectionQuery>
    local: IOfflineClientSet
    remote: IOfflineClientSet
}

const GlobalClientsContext = createNullableContext<IGlobalClients>("Clients not initialized")

export function GlobalDataSynchronizationWrapper(props: {children: React.ReactNode}) {
    const syncState = useDataSynchronizationGlobal()
    if(syncState.type === "pending") {
        return <MessageDialog title="加载中">
            {syncState.actions.message.map((it, i) => <p key={i}>{it}</p>)}
        </MessageDialog>
    } else if (syncState.type === "fetal") {
        return <MessageDialog title="出现严重错误">
            <p>请尝试刷新页面</p>
            <pre style={{color: "red"}}>{syncState.actions.message}</pre>
        </MessageDialog>
    } else if (syncState.type === "online" || syncState.type === "offline") {
        const clients: IGlobalClients = {
            mode: "online",
            ...syncState.actions
        }
        return <GlobalClientsContext.Provider value={clients}>
            {props.children}
        </GlobalClientsContext.Provider>
    } else if (syncState.type === "broken_remote") {
        return <ProgressActionDialog title="远程数据库损坏" proceed={syncState.actions.proceed}>
            <p>检测到同步失败</p>
            <p>点击"继续"将启动修复过程</p>
            <ul>
                <li>回退远程数据库到还原点，还原点后的数据将全部丢失</li>
                <li>重新同步本地数据到远程数据库</li>
            </ul>
        </ProgressActionDialog>
    } else if (syncState.type === "low_version") {
        return <ProgressActionDialog title="本地数据库版本过低" proceed={syncState.actions.proceed}>
            <p>点击"继续"将用远程数据覆盖本地数据库</p>
            <p style={{color: "red"}}>尚未同步的数据将全部丢失!</p>
        </ProgressActionDialog>
    } else if(syncState.type === "auth_required") {
        /// TODO:
        return <div>还没做</div>
    } else {
        throw new Error(`Invalid state`)
    }
    
}

function MessageDialog(props: {title: string, children: React.ReactNode}) {
    return <Modal title={props.title} open={true} cancelButtonProps={{ style: { display: 'none' } }} okButtonProps={{ style: { display: 'none' } }}>
        {props.children}
    </Modal>
}

function ProgressActionDialog(props: {title: string, children: React.ReactNode, proceed: () => Promise<void>}) {
    return <Modal title={props.title} open={true} onOk={props.proceed} cancelButtonProps={{ style: { display: 'none' } }} okText="继续" okButtonProps={{danger: true}}>
        {props.children}
    </Modal>
}
