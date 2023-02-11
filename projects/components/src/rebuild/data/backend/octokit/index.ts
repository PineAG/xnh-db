export * from "./client"
export * from "./local"

import { DbUiConfiguration } from "../../../config"
import { BackendBase } from "../base"
import {OctokitClient, OctokitRepoClient, OctokitResults} from "./client"

export function createOfflineClientSet<Props extends DbUiConfiguration.DataPropsBase>(config: Props, cert: string, branch: OctokitResults.Branch): BackendBase.OfflineClientSet<Props> {
    const client = new OctokitClient(cert)
    function pathFactory(path: string) {
        return new OctokitRepoClient(client.octokit, branch, `data/${path}`)
    }
    return BackendBase.Path.createOfflineClientSetFromPathFactory(config, pathFactory)
}
