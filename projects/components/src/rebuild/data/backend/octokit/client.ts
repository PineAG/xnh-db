import {OfflinePathClientUtils} from "@xnh-db/protocol"
import {Octokit} from "@octokit/rest"
import * as base64 from "js-base64"

export module OctokitResults {
    export interface Repo {
        owner: string,
        repo: string
    }
    export interface Branch {
        owner: string,
        repo: string,
        branch: string
    }
    export interface Directory {
        owner: string,
        repo: string,
        branch: string,
        dir: string
    }
}

export class OctokitClient {
    readonly octokit: Octokit
    constructor(authToken: string){
        this.octokit = new Octokit({
            auth: authToken
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

    async getBranches(repo: OctokitResults.Repo): Promise<string[]> {
        const result = await this.octokit.repos.listBranches({
            owner: repo.owner,
            repo: repo.repo
        })
        return result.data.map(it => it.name)
    }

    openRepo(branch: OctokitResults.Branch): OctokitRepoClient {
        return new OctokitRepoClient(this.octokit, branch)
    }

    openBranchMaintenance(branch: OctokitResults.Branch): OctokitBranchMaintenanceClient {
        return new OctokitBranchMaintenanceClient(this.octokit, branch)
    }
    
}

export class OctokitRepoClient implements OfflinePathClientUtils.IPathClient {
    constructor(private octokit: Octokit, private branch: OctokitResults.Branch, private pathPrefix?: string) {}

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
                owner: this.branch.owner,
                repo: this.branch.repo,
                path: this.patchPath(path),
                ref: this.branch.branch
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
            const bin = base64.toUint8Array(b64)
            return new Blob([bin])
        }
        throw new Error("This shouldn't happen.")
    }
    async write(path: string, value: Blob): Promise<void> {
        const b64 = base64.fromUint8Array(new Uint8Array(await value.arrayBuffer()))
        const sha = await this.getSHA(path)
        await this.octokit.repos.createOrUpdateFileContents({
            owner: this.branch.owner,
            repo: this.branch.repo,
            branch: this.branch.branch,
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
            const res = await this.octokit.repos.getContent({
                owner: this.branch.owner,
                repo: this.branch.repo,
                path: this.patchPath(path),
                ref: `refs/heads/${this.branch.branch}`,
                mediaType: {
                    format: "sha"
                }
            })
            const {data: shaResult} = res
            if(Array.isArray(shaResult) || shaResult.type !== "file") {
                console.error(res)
                throw new Error(`Cannot delete ${path}`)
            }
            return shaResult.sha
        }catch(e) {
            if(e["message"] === "Not Found") {
                return undefined
            } else {
                throw e
            }
        }
    }

    async delete(path: string): Promise<void> {
        const sha = await this.getSHA(path)
        if(!sha) {
            console.warn("sha == undefined: " + path)
            return
        }
        await this.octokit.repos.deleteFile({
            owner: this.branch.owner,
            repo: this.branch.repo,
            branch: this.branch.branch,
            path: this.patchPath(path),
            message: `Delete ${path}`,
            sha
        })
    }

}


export class OctokitBranchMaintenanceClient {
    constructor(private octokit: Octokit, private branch: OctokitResults.Branch) {}

    async getCommit(): Promise<string> {
        const result = await this.octokit.repos.getBranch({
            owner: this.branch.owner,
            repo: this.branch.repo,
            branch: this.branch.branch
        })
        return result.data.commit.sha
    }

    async backup(): Promise<void> {
        const currentCommit = await this.getCommit()
        await this.octokit.git.createRef({
            owner: this.branch.owner,
            repo: this.branch.repo,
            ref: `refs/heads/${this.branch.branch}-backup-${new Date().getTime()}`,
            sha: currentCommit,
        })
    }

    async rollback(commit: string): Promise<void> {
        await this.octokit.git.updateRef({
            owner: this.branch.owner,
            repo: this.branch.repo,
            ref: `heads/${this.branch.branch}`,
            sha: commit,
            force: true
        })
    }
}