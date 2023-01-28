import {PathSyncClient} from "@xnh-db/protocol"
import {Octokit} from "@octokit/rest"
import * as base64 from "js-base64"

export module OctokitResults {
    export interface Repo {
        owner: string,
        repo: string
    }
}

export class OctokitClient {
    private octokit: Octokit
    constructor(){
        const pat = localStorage["github.pat"]
        this.octokit = new Octokit({
            auth: pat
        })
    }

    async getRepos(): Promise<OctokitResults.Repo[]> {
        const result = await this.octokit.repos.listForAuthenticatedUser()
        if(result.status !== 200) {
            throw new Error(JSON.stringify(result))
        }
        return result.data.map(it => ({
            owner: it.owner.login,
            repo: it.name
        }))
    }

    openRepo(repo: OctokitResults.Repo): OctokitRepoClient {
        return new OctokitRepoClient(this.octokit, repo)
    }

    
}

export class OctokitRepoClient implements PathSyncClient.IPathClient {
    constructor(private octokit: Octokit, private repo: OctokitResults.Repo, private pathPrefix?: string) {}

    private patchPath(path: string): string {
        if(this.pathPrefix === undefined) {
            return path
        } else {
            return `${this.pathPrefix}/${path}`
        }
    }

    async read(path: string): Promise<Blob | null> {
        let result: Awaited<ReturnType<typeof this.octokit.repos.getContent>>
        try {
            result = await this.octokit.repos.getContent({
                owner: this.repo.owner,
                repo: this.repo.repo,
                path: this.patchPath(path)
            })
        } catch (e) {
            if(e["message"] === "Not Found") {
                return null
            } else {
                throw e
            }
        }
        const data = result.data
        if(Array.isArray(data)) {
            throw new Error("Cannot open directory")
        } else if (data.type === "file") {
            const b64 = data.content
            const text = base64.decode(b64)
            return new Blob([new TextEncoder().encode(text)])
        }
    }
    async write(path: string, value: Blob): Promise<void> {
        const sha = await this.getSHA(path)
        const buf = await value.arrayBuffer()
        const b64 = base64.encode(new TextDecoder().decode(buf))
        console.log(b64)
        await this.octokit.repos.createOrUpdateFileContents({
            owner: this.repo.owner,
            repo: this.repo.repo,
            path: this.patchPath(path),
            content: b64,
            mediaType: {
                format: "text"
            },
            message: `Update ${path}`,
            sha
        })
    }

    async getSHA(path: string): Promise<undefined | string> {
        try {
            const {data: shaResult} = await this.octokit.repos.getContent({
                owner: this.repo.owner,
                repo: this.repo.repo,
                path: this.patchPath(path),
                mediaType: {
                    format: "sha"
                }
            })
            if(Array.isArray(shaResult) || shaResult.type !== "file") {
                throw new Error(`Cannot delete ${path}`)
            }
            return shaResult.sha
        }catch(e) {
            if(e["message"] === "Not Found") {
                return undefined
            }
        }
    }

    async delete(path: string): Promise<void> {
        const sha = await this.getSHA(path)
        await this.octokit.repos.deleteFile({
            owner: this.repo.owner,
            repo: this.repo.repo,
            path: this.patchPath(path),
            message: `Delete ${path}`,
            sha
        })
    }

}
