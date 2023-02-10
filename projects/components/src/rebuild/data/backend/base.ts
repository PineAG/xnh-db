import { IOfflineClient, IOnlineClient, FieldConfig as FC } from "@xnh-db/protocol"
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
        relations: {
            [R in keyof Props["relations"]]: IOnlineClient.Relation<Extract<keyof Props["relations"][R]["collections"], string>, FC.EntityFromConfig<Props["relations"][R]["payloadConfig"]>>
        },
        files: IOnlineClient.Files
        tags: IOnlineClient.Tags
    }
}