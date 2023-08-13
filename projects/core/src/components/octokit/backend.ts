import {Octokit} from "@octokit/rest"
import { DBFileBackend } from "@xnh-db/common";
import * as B64 from "js-base64"
import Dayjs from "dayjs"

export module OctokitBackend {
    export interface RepoTarget {
        owner: string
        repo: string
    }

    export interface SyncTarget {
        owner: string
        repo: string
        branch: string
    }

    export interface CommitterInfo {
        name: string,
        email: string
    } 

    export interface ReadonlyOptions {
        target: SyncTarget
    }

    export class ReadonlyBackend implements DBFileBackend.IFileReadonlyBackend {
        constructor(private octokit: Octokit, private options: ReadonlyOptions) {}

        reader(): DBFileBackend.IFileReader {
            return new FileReader(this.octokit, this.options.target)
        }
    }

    export interface Options {
        target: SyncTarget
        committer: CommitterInfo
    }

    export class FileBackend implements DBFileBackend.IFileBackend {
        constructor(private octokit: Octokit, private options: Options) {}
        reader(): DBFileBackend.IFileReader {
            return new FileReader(this.octokit, this.options.target)
        }
        writer(): DBFileBackend.IFileWriter {
            return new FileWriter(this.octokit, this.options.committer, this.options.target)
        }
    }

    class FileReader implements DBFileBackend.IFileReader {
        constructor(private octokit: Octokit, private target: SyncTarget) {}
        
        async read(name: string): Promise<Uint8Array | null> {
            const adaptor = new OctokitAdaptor(this.octokit)
            return await adaptor.readFileContent(this.target, name)
        }
    }

    class FileWriter implements DBFileBackend.IFileWriter {
        private fileContent: Record<string, Uint8Array> = {}
        private deletedFiles = new Set<string>()

        constructor(private octokit: Octokit, private committer: CommitterInfo, private target: SyncTarget) {}
        
        write(name: string, value: Uint8Array): void {
            this.fileContent[name] = value
        }
        delete(name: string): void {
            this.deletedFiles.add(name)
        }
        async commit(onMessage?: (message: string) => void): Promise<void> {
            const adaptor = new OctokitAdaptor(this.octokit)
            const message = commitMessageByDate()
            const committer = this.committer
            const currentCommit = await adaptor.getBranchCommit(this.target)
            const blobs: Record<string, string> = {}
            for(const [path, blob] of Object.entries(this.fileContent)) {
                onMessage?.call(null, `Uploading blob ${path}`)
                blobs[path] = await adaptor.createBlob(this.target, blob)
            }

            onMessage?.call(null, `Committing ${this.target.owner}/${this.target.repo}/${this.target.branch}`)
            if(currentCommit) {
                const treeHash = await adaptor.createTree(this.target, blobs, Array.from(this.deletedFiles), currentCommit)
                const commitHash = await adaptor.createCommit(this.target, message, committer, treeHash, [currentCommit])
                await adaptor.resetBranch(this.target, commitHash)
            } else {
                console.warn(`Branch not exists, creating branch ${this.target.branch}`)
                const treeHash = await adaptor.createTree(this.target, blobs, Array.from(this.deletedFiles), undefined)
                const commitHash = await adaptor.createCommit(this.target, message, committer, treeHash, [])
                await adaptor.createBranch(this.target, commitHash)
            }
        }
        
    }

    export interface UserInfo {
        username: string
        displayName: string
        email: string
    }

    export class OctokitAdaptor {
        constructor(private octokit: Octokit) {}

        async readFileContent(target: SyncTarget, name: string) {
            const {owner, repo, branch} = target
            try {
                const {data} = await this.octokit.repos.getContent({
                    owner,
                    repo,
                    ref: branch,
                    path: name
                })
                
                if(Array.isArray(data)) {
                    throw new Error(`${name} is a dir`)
                }
                if(data.type !== "file") {
                    throw new Error(`Invalid type of ${name}: ${data.type}`)
                }
                return B64.toUint8Array(data.content)
            } catch(ex: any) {
                const status = ex && ex["status"]
                if(typeof status === "number" && status === 404) {
                    return null
                } else {
                    throw ex
                }
            }
        }

        async getBranchCommit(target: SyncTarget): Promise<string | null> {
            const {owner, repo, branch} = target
            try {
                const {data} = await this.octokit.repos.getBranch({
                    owner, repo, branch
                })
                return data.commit.sha
            } catch (ex: any) {
                if(ex && ex["status"] && typeof ex["status"] === "number" && ex["status"] === 404) {
                    return null
                } else {
                    throw ex
                }
            }
        }

        async createBranch(target: SyncTarget, commitSha: string) {
            const {owner, repo, branch} = target
            await this.octokit.git.createRef({
                owner, repo, ref: `refs/heads/${branch}`,
                sha: commitSha
            })
        }

        async createBlob(target: RepoTarget, blob: Uint8Array): Promise<string> {
            const {owner, repo} = target

            const {data} = await this.octokit.git.createBlob({
                owner, repo,
                content: B64.fromUint8Array(blob),
                encoding: "base64"
            })

            return data.sha
        } 

        /// putFiles: {path: sha}
        async createTree(target: RepoTarget, putFiles: Record<string, string>, deletedFiles: string[], baseCommit: string | undefined): Promise<string> {
            const {owner, repo} = target

            type TreeItem = {path: string, sha: null | string} // add content / delete file
            const items: TreeItem[] = []

            for(const [path, sha] of Object.entries(putFiles)) {
                items.push({
                    path,
                    sha
                })
            }

            for(const path of deletedFiles) {
                items.push({
                    path,
                    sha: null
                })
            }

            const res = await this.octokit.git.createTree({
                owner, repo,
                base_tree: baseCommit,
                tree: items.map(it => ({...it, mode: "100644"}))
            })

            return res.data.sha
        }

        async createCommit(target: RepoTarget, message: string, committer: CommitterInfo, treeSha: string, parents: string[]): Promise<string> {
            const {owner, repo} = target
            const {data} = await this.octokit.git.createCommit({
                owner, repo,
                message,
                committer,
                tree: treeSha,
                parents
            })
            return data.sha
        }

        async resetBranch(target: SyncTarget, commit: string, force: boolean = false) {
            const {owner, repo, branch} = target
            await this.octokit.git.updateRef({
                owner, repo, ref: `heads/${branch}`,
                force,
                sha: commit
            })
        }

        async listRepos(): Promise<RepoTarget[]> {
            const {data} = await this.octokit.repos.listForAuthenticatedUser()
            return data.map(it => ({repo: it.name, owner: it.owner.login}))
        }

        async listBranches(target: RepoTarget): Promise<string[]> {
            const {owner, repo} = target
            const {data} = await this.octokit.repos.listBranches({
                owner,
                repo,
            })
            return data.map(it => it.name)
        }

        async getUserInfo(): Promise<UserInfo> {
            const {data} = await this.octokit.users.getAuthenticated()
            return {
                username: data.login,
                displayName: data.name ?? data.login,
                email: data.email ?? `${data.login}@github.io`
            }
        }
    }

    function commitMessageByDate() {
        const date = Dayjs().format('YYYY-MM-DDTHH:mm:ssZ[Z]')
        return `Auto commit ${date}`
    }
}
