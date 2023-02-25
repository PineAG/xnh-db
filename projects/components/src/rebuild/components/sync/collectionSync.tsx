import React, { useEffect, useState } from "react"
import { DbUiConfiguration } from "../../config"
import { createNullableContext, DbContexts, useNullableContext } from "../context"
import { GlobalSyncComponents } from "./globalSync"
import {UiSyncUtils} from "./sync"

export module CollectionSyncComponents {
    type GPBase = DbUiConfiguration.GlobalPropsBase
    import Utils = UiSyncUtils
    import ConfigUtils = DbUiConfiguration.InternalUtils

    type UploadFn = () => Promise<void>

    type CollectionSyncResult = {pending: true, syncMessages: string[]} | {pending: false, updateCollection: UploadFn}

    function useCollectionSync<GP extends GPBase>(collectionName: ConfigUtils.CollNames<GP>): CollectionSyncResult {
        const globalConfig = DbContexts.useProps() as GP
        const clients = GlobalSyncComponents.useClients()
        const [syncMessages, setSyncMessages] = useState<string[] | null>(null)
        const [pending, setPending] = useState(true)

        useEffect(() => {
            initialize()
        }, [collectionName])

        if(pending) {
            return {
                pending: true,
                syncMessages: syncMessages ?? ["正在同步"]
            }
        } else {
            return {
                pending: false,
                updateCollection
            }
        }

        async function initialize() {
            setPending(true)
            setSyncMessages(null)
            await Utils.synchronizeAllClients(globalConfig, clients.clients, "download", message => {
                setSyncMessages(["正在下载数据", message])
            })
            setSyncMessages(null)
            setPending(false)
        }

        async function updateCollection() {
            setSyncMessages(null)
            setPending(true)
            await Utils.synchronizeAllClients(globalConfig, clients.clients, "upload", message => {
                setSyncMessages(["正在上传数据", message])
            })
            setSyncMessages(["正在清理临时数据"])
            await Utils.clearDirty(clients.clients)
            setPending(false)
            setSyncMessages(null)
        }
    }

    export function useUpstreamSynchronize(collectionName: string): [React.ReactNode, () => Promise<void>] {
        const globalConfig = DbContexts.useProps()
        const {mode, clients} = GlobalSyncComponents.useClients()
        const {DisplayDialog} = DbContexts.useComponents()

        const [messages, setMessages] = useState<string[] | null>(null)

        if(mode === "offline") {
            console.error("Not online.")
            return [<div>尚未登录！</div>, () => Promise.resolve()]
        }

        if(messages === null) {
            return [<></>, upload]
        } else {
            const component = <DisplayDialog open={true} width="small" title="正在上传数据">
                {messages.map(it => <p key={it}>{it}</p>)}
            </DisplayDialog>
            return [component, upload]
        }

        async function upload() {
            await Utils.synchronizeCollection(globalConfig, clients, collectionName, "upload", message => {
                setMessages(["正在上传数据", message])
            })
            setMessages(null)
        }
    }

    type ConsumerFn = (upload: UploadFn) => React.ReactNode
    const ResultContext = createNullableContext<CollectionSyncResult>("Collection sync not initialized")

    export interface ProviderProps<GP extends GPBase> {
        collection: ConfigUtils.CollNames<GP>
        children: React.ReactNode
    }

    export function Provider<GP extends GPBase>(props: ProviderProps<GP>) {
        const syncResult = useCollectionSync<GP>(props.collection)
        const {Loading} = DbContexts.useComponents()
        if(syncResult.pending === false) {
            return <ResultContext.Provider value={syncResult}>
                {props.children}
            </ResultContext.Provider>
        } else {
            return <>
                <Loading/>
                <MessageDialog messages={syncResult.syncMessages}/>
            </>
        }
    }

    export function useUploadCollection() {
        const result = useNullableContext(ResultContext)
        if(result.pending === false) {
            return result.updateCollection
        } else {
            throw new Error("Collection sync not initialized")
        }
    }

    export interface WrapperProps<GP extends GPBase> {
        collection: ConfigUtils.CollNames<GP>
        children: ConsumerFn
    }

    export function Wrapper<GP extends GPBase>(props: WrapperProps<GP>) {
        const syncResult = useCollectionSync<GP>(props.collection)
        const {Loading} = DbContexts.useComponents()

        if(syncResult.pending === false) {
            return props.children(syncResult.updateCollection)
        } else {
            return <>
                <Loading/>
                <MessageDialog messages={syncResult.syncMessages}/>
            </>
        }
    }

    function MessageDialog(props: {messages: string[]}) {
        const {DisplayDialog} = DbContexts.useComponents()
        return <DisplayDialog title="同步集合" open={true} width="small">
            {props.messages?.map((it, i) => (<p key={i}>{it}</p>))}
        </DisplayDialog>
    }
}