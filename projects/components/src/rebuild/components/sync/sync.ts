import { OfflineClientSynchronization } from "@xnh-db/protocol";
import { DbUiConfiguration } from "../../config";
import { DBStorage } from "../../data";

export module UiSyncUtils {
    type GPBase = DbUiConfiguration.GlobalPropsBase
    import Utils = DbUiConfiguration.InternalUtils
    import SyncUtils = OfflineClientSynchronization
    import Progress = SyncUtils.ProgressResult.Progress

    export type SynchronizationMode = "download" | "upload"
    type ProgMsgHandler = (msg: string) => void

    export async function synchronizeAllClients<GP extends GPBase>(config: GP, clients: DBStorage.DBBackendSet<GP["props"]>, mode: SynchronizationMode, onProgressMessage?: ProgMsgHandler) {
        const collections = config.props.collections
        const [sourceClients, destinationClients] = mode === "download" ? [clients.remote, clients.local] : [clients.local, clients.remote]
        for(const collectionName in collections) {
            const src = sourceClients.collections[collectionName]
            const dst = destinationClients.collections[collectionName]
            for await (const progress of SyncUtils.synchronizeCollection(src, dst)) {
                if(onProgressMessage) {
                    const title = ProgressUtils.getCollectionName(config, collectionName as any)
                    onProgressMessage(`项目 ${title}: ${ProgressUtils.stringifyProgressResult(progress)}`)
                }
            }
            if(collections[collectionName].inheritable) {
                const src = sourceClients.inheritance[collectionName]
                const dst = destinationClients.inheritance[collectionName]
                if(!src || !dst) {
                    throw new Error("Missing inheritance clients")
                }
                for await (const progress of SyncUtils.synchronizeRelation(src, dst)) {
                    if(onProgressMessage) {
                        const title = ProgressUtils.getCollectionName(config, collectionName as any)
                        onProgressMessage(`${title} 继承关系: ${ProgressUtils.stringifyProgressResult(progress)}`)
                    }
                }
            }
        }
        const relations = config.props.relations
        for(const relationName in relations) {
            const src = sourceClients.relations[relationName]
            const dst = destinationClients.relations[relationName]
            for await (const progress of SyncUtils.synchronizeRelation(src, dst)) {
                if(onProgressMessage) {
                    const title = ProgressUtils.getRelationName(config, relationName as any)
                    onProgressMessage(`关系 ${title}: ${ProgressUtils.stringifyProgressResult(progress)}`)
                }
            }
        }
        await synchronizeFiles(config, clients, mode, onProgressMessage)
    }

    export async function synchronizeCollection<
        GP extends GPBase, 
        CollectionName extends Utils.CollNames<GP>
    >(config: GP, clients: DBStorage.DBBackendSet<GP["props"]>, collectionName: CollectionName, mode: SynchronizationMode, onProgressMessage?: ProgMsgHandler) {
        const [sourceClients, destinationClients] = mode === "download" ? [clients.remote, clients.local] : [clients.local, clients.remote]
        const srcColClient = sourceClients.collections[collectionName]
        const dstColClient = destinationClients.collections[collectionName]

        for await (const progress of SyncUtils.synchronizeCollection(srcColClient, dstColClient)) {
            if(onProgressMessage) {
                const title = ProgressUtils.getCollectionName(config, collectionName as any)
                onProgressMessage(`项目 ${title}: ${ProgressUtils.stringifyProgressResult(progress)}`)
            }
        }

        const srcInheritClient = sourceClients.inheritance[collectionName]
        const dstInheritClient = destinationClients.inheritance[collectionName]
        if(config.props.collections[collectionName].inheritable) {
            if(!srcInheritClient || !dstInheritClient) {
                throw new Error("Missing inherit clients")
            }
            for await (const progress of SyncUtils.synchronizeRelation(srcInheritClient, dstInheritClient)) {
                if(onProgressMessage) {
                    const title = ProgressUtils.getCollectionName(config, collectionName as any)
                    onProgressMessage(`${title} 继承关系: ${ProgressUtils.stringifyProgressResult(progress)}`)
                }
            }
        }

        const colToRelSet = config.props.collectionsToRelations[collectionName]
        for(const colToRelName in colToRelSet) {
            const {relation: relationName} = colToRelSet[colToRelName]
            const src = sourceClients.relations[relationName]
            const dst = destinationClients.relations[relationName]
            for await (const progress of SyncUtils.synchronizeRelation(src, dst)) {
                if(onProgressMessage) {
                    const title = ProgressUtils.getRelationName(config, relationName as any)
                    onProgressMessage(`关系 ${title}: ${ProgressUtils.stringifyProgressResult(progress)}`)
                }
            }
        }

        await synchronizeFiles(config, clients, mode, onProgressMessage)
    }

    export async function synchronizeFiles<GP extends GPBase>(config: GP, clients: DBStorage.DBBackendSet<GP["props"]>, mode: SynchronizationMode, onProgressMessage?: ProgMsgHandler) {
        const local = clients.local.files
        const remote = clients.remote.files
        if(mode === "upload") {
            for await (const progress of SyncUtils.Files.upload(local, remote)) {
                if(onProgressMessage) {
                    onProgressMessage(`上传文件: ${ProgressUtils.stringifyProgressResult(progress)}`)
                }
            }
        } else {
            for await (const progress of SyncUtils.Files.download(local, remote)) {
                if(onProgressMessage) {
                    onProgressMessage(`下载文件: ${ProgressUtils.stringifyProgressResult(progress)}`)
                }
            }
        }
    }

    export module ProgressUtils {
        const actionType: Record<SyncUtils.ProgressResult.ItemActionType, string> = {
            create: "创建",
            delete: "删除",
            update: "覆盖"
        }
        const indexActions: Record<"push" | "pull", string> = {
            push: "更新",
            pull: "获取"
        }

        export function stringifyProgressResult(progress: Progress): string {
            if(progress.type === "item") {
                return `${actionType[progress.action.type]} 数据 ${progress.action.id} (${progress.action.progress.current+1}/${progress.action.progress.total})`
            } else if (progress.type === "file") {
                return `${actionType[progress.action.type]} 文件 ${progress.action.id} (${progress.action.progress.current+1}/${progress.action.progress.total})`
            } else if (progress.type === "index") {
                return `${indexActions[progress.action]} 索引`
            } else {
                throw new Error()
            }
        }

        export function getCollectionName<
            GP extends GPBase, 
            CollectionName extends Utils.CollNames<GP>
            >(config: GP, collectionName: CollectionName): string {
                const titles = config.layout.titles.entityTitles[collectionName]
                return titles["$title"]
            }
        
        export function getRelationName<
            GP extends GPBase, 
            RelationName extends Utils.RelName<GP>
            >(config: GP, relationName: RelationName): string {
                const titles = config.layout.titles.payloadTitles[relationName]
                return titles["$title"]
            }
    }
}
