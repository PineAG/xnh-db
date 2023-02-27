export * from "./client"
export * from "./local"

import { OfflinePathClientUtils } from "@xnh-db/protocol"
import { DbUiConfiguration } from "../../../config"
import { BackendBase } from "../base"
import {OctokitClient, OctokitRepoClient, OctokitResults} from "./client"

export function createOfflineClientSet<Props extends DbUiConfiguration.DataPropsBase>(config: Props, cert: string, branch: OctokitResults.Branch): BackendBase.OfflineClientSet<Props> {
    const client = new OctokitClient(cert)
    function pathFactory(path: string) {
        const pathClient = new OctokitRepoClient(client.octokit, branch, `data/${path}`)
        const retryClient = new OfflinePathClientUtils.RetryPathClient(pathClient, {
            maxRetry: 20,
            initialDelay: 1000,
            increaseFactor: 2,
        })
        return retryClient
    }
    return BackendBase.Path.createOfflineClientSetFromPathFactory(config, pathFactory)
}
