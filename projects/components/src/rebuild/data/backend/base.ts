import { IOfflineClient, IOnlineClient, FieldConfig as FC, OfflinePathClientUtils } from "@xnh-db/protocol"
import { DbUiConfiguration } from "../../config"

type DPBase = DbUiConfiguration.DataPropsBase
export module BackendBase {
    export interface Query {
        keyPath: string[]
        value: any
    }

    export type OfflineClientSet<Props extends DPBase> = {
        collections: {
            [C in keyof Props["collections"]]: IOfflineClient.Collection<FC.EntityFromConfig<Props["collections"][C]["config"]>>
        },
        relations: {
            [R in keyof Props["relations"]]: IOfflineClient.Relation<Extract<keyof Props["relations"][R]["collections"], string>, FC.EntityFromConfig<Props["relations"][R]["payloadConfig"]>>
        },
        files: IOfflineClient.Files
    }

    export type OnlineClientSet<Props extends DPBase> = {
        collections: {
            [C in keyof Props["collections"]]: IOnlineClient.Collection<FC.EntityFromConfig<Props["collections"][C]["config"]>, Query>
        },
        inheritance: {
            [C in keyof Props["collections"]]?: IOnlineClient.Relation<"parent" | "child", {}>
        },
        relations: {
            [R in keyof Props["relations"]]: IOnlineClient.Relation<Extract<keyof Props["relations"][R]["collections"], string>, FC.EntityFromConfig<Props["relations"][R]["payloadConfig"]>>
        },
        files: IOnlineClient.Files
        tags: IOnlineClient.Tags
    }

    export module Path {
        type OfflinePathClientFactory = (path: string) => OfflinePathClientUtils.IPathClient
        export function createOfflineClientSetFromPathFactory<Props extends DPBase>(config: Props, clientFactory: OfflinePathClientFactory): OfflineClientSet<Props> {
            const collections: Record<string, IOfflineClient.Collection<any>> = {}
            for(const name in config.collections) {
                collections[name] = new OfflinePathClientUtils.Collection(clientFactory(`collections/${name}`))
            }

            const relations: Record<string, IOfflineClient.Relation<any, any>> = {}
            for(const name in config.relations) {
                relations[name] = new OfflinePathClientUtils.Relation(clientFactory(`relations/${name}`))
            }

            const files = new OfflinePathClientUtils.Files(clientFactory(`files`))

            type Result = OfflineClientSet<Props>
            return {
                collections: collections as Result["collections"],
                relations: relations as Result["relations"],
                files
            }
        }
    }

}