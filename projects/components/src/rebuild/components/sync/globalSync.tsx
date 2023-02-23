import { XnhDBProtocol as P } from "@xnh-db/protocol"
import { useEffect, useState, useMemo } from "react"
import { DbUiConfiguration } from "../../config"
import { BackendBase, DBStorage, IndexedDBBackend, OctokitBackend } from "../../data"
import { XBinding } from "../binding"
import { createNullableContext, DbContexts, useNullableContext } from "../context"
import { AuthorizationComponents } from "./auth"
import { UiSyncUtils } from "./sync"


import GPBase = DbUiConfiguration.GlobalPropsBase
import DPBase = DbUiConfiguration.DataPropsBase
type IdbCollectionQuery = BackendBase.Query
import OctokitCertificationStore = OctokitBackend.OctokitCertificationStore
import OctokitClient = OctokitBackend.OctokitClient

export module GlobalSyncComponents {
    type ForceProceedingAction = {proceed: () => Promise<void>}
    type CancelableAction = {proceed: () => Promise<void>, cancel: () => Promise<void>}
    type InitializedClients = DBStorage.DBBackendSet<DbUiConfiguration.DataPropsBase>

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

    function useDataSynchronizationGlobal<GP extends GPBase>(): DataSynchronizationGlobalResults {
        const [state, setState] = useState<keyof DataSynchronizationGlobalState>("pending")
        const [message, setPendingMessage] = useState<string[]>([])
        const [fetalMessage, setFetalMessage] = useState<string>("")

        const globalProps = DbContexts.useProps() as GP

        const [clients, setClients] = useState<null | InitializedClients>(null)

        const createOnlineClients = DbContexts.useOnlineClientsBuilder()
        const createOfflineClients = DbContexts.useOfflineClientsBuilder()
        const destroyLocalStorage = DbContexts.useDestroyLocalStorage()

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

        function setMessage(message: string[]) {
            console.log(message)
            setPendingMessage(message)
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
                            if(version && version !== P.XNH_DB_DATA_VERSION) {
                                state = "low_version"
                            }else{
                                const onlineClients = createOnlineClients(cert.token, cert.repo)
                                await _syncClients(["正在同步数据...", "首次同步可能花费较长时间"], onlineClients)
                                state = "online"
                                setClients(createOnlineClients(cert.token, cert.repo))
                            }
                        }
                    }
                } else { // offline
                    if(version && version !== P.XNH_DB_DATA_VERSION) {
                        setMessage(["版本不一致, 正在重新同步..."])
                        await destroyLocalStorage()
                    }
                    const offlineClients = createOfflineClients()
                    await _syncClients(["正在同步数据", "首次同步可能花费较长时间"], offlineClients)
                    OctokitCertificationStore.version.set(P.XNH_DB_DATA_VERSION)
                    setMessage(["同步完成"])
                    state = "offline"
                    setClients(offlineClients)
                }
                setState(state)
            }catch(e) {
                console.error(e)
                setFetalMessage(e.toString())
                setState("fetal")
                throw(e)
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

        async function _syncClients(prefixMessages: string[], clients: DBStorage.DBBackendSet<GP["props"]>) {
            await UiSyncUtils.synchronizeAllClients(globalProps, clients, "download", message => setMessage([...prefixMessages, message]))
        }

        async function _reverseSync(prefixMessages: string[], clients: DBStorage.DBBackendSet<GP["props"]>) {
            await UiSyncUtils.synchronizeAllClients(globalProps, clients, "download", message => setMessage([...prefixMessages, message]))
        }


        async function switchToOffline() {
            setMessage([])
            setState("pending")
            try {
                OctokitCertificationStore.clear()
                await destroyLocalStorage()
                await initialize()
            }catch(e) {
                setFetalMessage(e.toString())
                setState("fetal")
                console.error(e)
                throw(e)
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

                const onlineClients = createOnlineClients(cert.token, cert.repo)

                await _reverseSync(["正在重新同步到远程数据库..."], onlineClients)
                OctokitCertificationStore.backupCommit.clear()

                setClients(onlineClients)
                setState("online")
            }catch(e) {
                setFetalMessage(e.toString())
                setState("fetal")
                console.error(e)
                throw(e)
            }
        }

        async function fixLowVersion() {
            setMessage([])
            setState("pending")
            try {
                await destroyLocalStorage()
                OctokitCertificationStore.version.set(P.XNH_DB_DATA_VERSION)
                await initialize()
            }catch(e) {
                setFetalMessage(e.toString())
                setState("fetal")
                console.error(e)
                throw(e)
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
                console.error(e)
                throw(e)
            }
        }
    }

    export interface IGlobalClients {
        mode: "online" | "offline"
        clients: DBStorage.DBBackendSet<DPBase>
    }

    const GlobalClientsContext = createNullableContext<IGlobalClients>("Clients not initialized")


    export function useClients(): IGlobalClients {
        return useNullableContext(GlobalClientsContext)
    }

    export function useQueryClients(): BackendBase.OnlineClientSet<DPBase> {
        const clients = useClients()
        return clients.clients.query
    }

    export function useDownloadFile() {
        const config = DbContexts.useProps()
        const clients = useClients()
        return (fileName: string) => UiSyncUtils.retrieveRemoteFile(config.props, clients.clients, fileName)
    }

    export function useObjectURL(fileName: string | undefined) {
        const downloadFile = useDownloadFile()
        const [url, setUrl] = useState<string | null>(null)
        useEffect(() => {
            let url: string | undefined
            load().then(s => {
                url = s
                setUrl(s ?? null)
            })
            return () => {
                if(url) {
                    URL.revokeObjectURL(url)
                }
            }
        })

        return url

        async function load() {
            if(!fileName) {
                return
            }
            const blob = await downloadFile(fileName)
            return URL.createObjectURL(blob)
        }
    }

    export function GlobalDataSynchronizationWrapper(props: {children: React.ReactNode}) {
        const syncState = useDataSynchronizationGlobal()

        if(syncState.type === "pending") {
            return <MessageDialog title="加载中">
                {syncState.actions.message.map((it, i) => <p key={i}>{it}</p>)}
            </MessageDialog>
        } else if (syncState.type === "fetal") {
            return <MessageDialog title="出现严重错误">
                <p>请尝试刷新页面</p>
                <pre style={{color: "red", whiteSpace: "break-spaces"}}>{syncState.actions.message}</pre>
            </MessageDialog>
        } else if (syncState.type === "online" || syncState.type === "offline") {
            const clients: IGlobalClients = {
                mode: syncState.type,
                clients: syncState.actions
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
            return <AuthorizationComponents.GithubAuthDialog
                onClose={cert => {
                    if(cert){
                        syncState.actions.proceed(cert)
                    } else {
                        syncState.actions.cancel()
                    }
                }}
                dangerousCancel
            />
        } else {
            throw new Error(`Invalid state`)
        }
        
    }

    function MessageDialog(props: {title: string, children: React.ReactNode}) {
        const {Dialog} = DbContexts.useComponents()
        return <Dialog title={props.title} open={true}  width="small">
            {props.children}
        </Dialog>
    }

    function ProgressActionDialog(props: {title: string, children: React.ReactNode, proceed: () => Promise<void>}) {
        const {Dialog} = DbContexts.useComponents()
        return <Dialog title={props.title} open={true} onOkay={props.proceed} width="small">
            {props.children}
        </Dialog>
    }

    export module Mock {
        export function GlobalSyncWrapper(props: {children: React.ReactNode}) {
            const createMockClients = DbContexts.useMockClientsBuilder()

            return <GlobalClientsContext.Provider value={{
                mode: "online",
                clients: createMockClients()
            }}>
                    {props.children}
            </GlobalClientsContext.Provider>
        }
    }
}