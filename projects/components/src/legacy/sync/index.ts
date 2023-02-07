import { XnhDBProtocol } from "@xnh-db/protocol"
import { OctokitCertificationStore } from "./local"
import {OctokitRepoClient, OctokitClient} from "./client"

export * from "./client"
export * from "./local"
export * from "./inherit"

export function createOctokitOfflineClientSet(repo: OctokitCertificationStore.IGithubCert): XnhDBProtocol.IOfflineClientSet {
    return XnhDBProtocol.createPathOfflineClientSet(path => {
        const client = new OctokitClient(repo.token)
        return new OctokitRepoClient(client.octokit, repo.repo, `data/${path}`)
    })
}
