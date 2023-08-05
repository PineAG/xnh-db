import {Octokit} from "@octokit/rest"
import { DBFileBackend } from "@xnh-db/common";
import * as B64 from "js-base64"
import Dayjs from "dayjs"

export module OctokitBackend {
    export interface SyncTarget {
        owner: string
        repo: string
        branch: string
    }

    export interface Options {
        target: SyncTarget
        committer: CommitterInfo
    }

    export class FileBackend implements DBFileBackend.IFileBackend {
        constructor(private octokit: Octokit, private options: Options) {}
        reader(): DBFileBackend.IFileReader {
            return new FileReader(this.octokit,this.options)
        }
        writer(): DBFileBackend.IFileWriter {
            return new FileWriter(this.octokit,this.options)
        }
    }

    class FileReader implements DBFileBackend.IFileReader {
        constructor(private octokit: Octokit, private options: Options) {}
        
        async read(name: string): Promise<Uint8Array | null> {
            const adaptor = new OctokitAdaptor(this.octokit, this.options.target)
            return await adaptor.readFileContent(name)
        }
    }

    class FileWriter implements DBFileBackend.IFileWriter {
        private fileContent: Record<string, Uint8Array> = {}
        private deletedFiles = new Set<string>()

        constructor(private octokit: Octokit, private options: Options) {}
        
        write(name: string, value: Uint8Array): void {
            this.fileContent[name] = value
        }
        delete(name: string): void {
            this.deletedFiles.add(name)
        }
        async commit(): Promise<void> {
            const adaptor = new OctokitAdaptor(this.octokit, this.options.target)
            const message = commitMessageByDate()
            const committer = this.options.committer
            const currentCommit = await adaptor.getBranchCommit()
            const blobs: Record<string, string> = {}
            for(const [path, blob] of Object.entries(this.fileContent)) {
                blobs[path] = await adaptor.createBlob(path, blob)
            }
            if(currentCommit) {
                const treeHash = await adaptor.createTree(blobs, Array.from(this.deletedFiles), currentCommit)
                const commitHash = await adaptor.createCommit(message, committer, treeHash, [currentCommit])
                await adaptor.resetBranch(commitHash)
            } else {
                console.warn(`Branch not exists, creating branch ${this.options.target.branch}`)
                const treeHash = await adaptor.createTree(blobs, Array.from(this.deletedFiles), undefined)
                const commitHash = await adaptor.createCommit(message, committer, treeHash, [])
                await adaptor.createBranch(commitHash)
            }
        }
        
    }

    export interface CommitterInfo {
        name: string,
        email: string
    } 

    export class OctokitAdaptor {
        constructor(private octokit: Octokit, private target: SyncTarget) {}

        async readFileContent(name: string) {
            const {owner, repo, branch} = this.target
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
            } catch(ex) {
                const status = ex && ex["status"]
                if(typeof status === "number" && status === 404) {
                    return null
                } else {
                    throw ex
                }
            }
        }

        async getBranchCommit(): Promise<string | null> {
            const {owner, repo, branch} = this.target
            try {
                const {data} = await this.octokit.repos.getBranch({
                    owner, repo, branch
                })
                return data.commit.sha
            } catch (ex) {
                if(ex && ex["status"] && typeof ex["status"] === "number" && ex["status"] === 404) {
                    return null
                } else {
                    throw ex
                }
            }
        }

        async createBranch(commitSha: string) {
            const {owner, repo, branch} = this.target
            await this.octokit.git.createRef({
                owner, repo, ref: `refs/heads/${branch}`,
                sha: commitSha
            })
        }

        async createBlob(path: string, blob: Uint8Array): Promise<string> {
            const {owner, repo} = this.target

            const {data} = await this.octokit.git.createBlob({
                owner, repo,
                content: B64.fromUint8Array(blob),
                encoding: "base64"
            })

            return data.sha
        }

        /// putFiles: {path: sha}
        async createTree(putFiles: Record<string, string>, deletedFiles: string[], baseCommit: string | undefined): Promise<string> {
            const {owner, repo} = this.target

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

        async createCommit(message: string, committer: CommitterInfo, treeSha: string, parents: string[]): Promise<string> {
            const {owner, repo} = this.target
            const {data} = await this.octokit.git.createCommit({
                owner, repo,
                message,
                committer,
                tree: treeSha,
                parents
            })
            return data.sha
        }

        async resetBranch(commit: string, force: boolean = false) {
            const {owner, repo, branch} = this.target
            await this.octokit.git.updateRef({
                owner, repo, ref: `heads/${branch}`,
                force,
                sha: commit
            })
        }


    }

    function commitMessageByDate() {
        const date = Dayjs().format('YYYY-MM-DDTHH:mm:ssZ[Z]')
        return `Auto commit ${date}`
    }
}
