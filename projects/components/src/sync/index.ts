import { IOfflineClientSet, PathSyncClient } from "@xnh-db/protocol"
import { OctokitCertificationStore } from "./local"
import {OctokitRepoClient, OctokitClient} from "./client"

export * from "./client"
export * from "./local"
export * from "./inherit"

export function createOctokitOfflineClientSet(repo: OctokitCertificationStore.IGithubCert): IOfflineClientSet {
    return PathSyncClient.createPathOfflineClientSet(path => {
        const client = new OctokitClient(repo.token)
        return new OctokitRepoClient(client.octokit, repo.repo, `data/${path}`)
    })
}
