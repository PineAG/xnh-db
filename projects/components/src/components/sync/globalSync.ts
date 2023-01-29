import { IOfflineClient, IOfflineClientSet, PathSyncClient, XNH_DB_DATA_VERSION } from "@xnh-db/protocol";
import { useEffect, useState, version } from "react";
import { createRestfulOfflineClientsSet } from "../../restful";
import { createIdbClients, destroyIdbStorage } from "../../storage";
import { stringifyProgressResult, synchronizeOfflineClientSet } from "../../storage/models/data";
import { createOctokitOfflineClientSet, OctokitCertificationStore, OctokitClient } from "../../sync";

type ForceProceedingAction = {proceed: () => Promise<void>}
type CancelableAction = {proceed: () => Promise<void>, cancel: () => Promise<void>}

type DataSynchronizationGlobalState = {
    "pending": {message: string[]},
    "auth_required": {
        proceed: (cert: OctokitCertificationStore.IGithubCert) => Promise<void>
        cancel: () => Promise<void>
    },
    "low_version": ForceProceedingAction,
    "broken_remote": ForceProceedingAction,
    "fetal": {message: string},
    "online": {},
    "offline": {}
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
        return {
            type: state,
            actions: {}
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

    async function switchToOffline() {
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
            await branch.rollback(commit)
            OctokitCertificationStore.backupCommit.clear()

            await initialize()
        }catch(e) {
            setFetalMessage(e.toString())
            setState("fetal")
        }
    }

    async function fixLowVersion() {
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
        try {
            OctokitCertificationStore.cert.set(cert)
            await initialize()
        }catch(e) {
            setFetalMessage(e.toString())
            setState("fetal")
        }
    }
}