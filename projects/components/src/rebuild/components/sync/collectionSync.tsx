import { createNullableContext, Loading, useNullableContext } from "@pltk/components"
import { message, Modal } from "antd"
import React, { useEffect, useState } from "react"
import { DbUiConfiguration } from "../../config"
import { DbContexts } from "../context"
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
            await Utils.synchronizeCollection(globalConfig, clients.clients, collectionName, "download", message => {
                setSyncMessages(["正在下载数据", message])
            })
            setSyncMessages(null)
            setPending(false)
        }

        async function updateCollection() {
            setSyncMessages(null)
            setPending(true)
            await Utils.synchronizeCollection(globalConfig, clients.clients, collectionName, "upload", message => {
                setSyncMessages(["正在上传数据", message])
            })
            setPending(false)
            setSyncMessages(null)
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
        return <Modal title="同步集合" open={true} cancelButtonProps={{ style: { display: 'none' } }} okButtonProps={{ style: { display: 'none' } }}>
            {props.messages?.map((it, i) => (<p key={i}>{it}</p>))}
        </Modal>
    }
}