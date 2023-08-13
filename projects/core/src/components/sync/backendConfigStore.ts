import { OctokitBackend } from "../octokit"
import { RestfulFileBackend } from "../restful"
import { Octokit } from "@octokit/rest"
import { DBClients, DBFileBackend } from "@xnh-db/common"
import { observable, action, makeAutoObservable, makeObservable, toJS, computed } from "mobx"

export module BackendConfigurationStore {
    export enum BackendType {
        Restful = "restful",
        GitHub = "github"
    }

    export interface BackendConfiguration {
        current: BackendType
        github: null | GitHubConfig
    }

    export interface GitHubConfig {
        owner: string
        repo: string
        branch: string
        token: string
        name: string
        email: string
    }

    export type BackendResult = {
        type: "readonly",
        backend: DBFileBackend.IFileReadonlyBackend
    } | {
        type: "readwrite",
        backend: DBFileBackend.IFileBackend
    }

    export class ConfigStore {
        @observable config: BackendConfiguration
        
        private storage: StorageAdaptor<BackendConfiguration>

        constructor(keyName: string) {
            makeAutoObservable(this)
            this.storage = new StorageAdaptor(localStorage, keyName)
            const config = this.storage.load() ?? {
                current: BackendType.Restful,
                github: null
            }
            this.config = makeAutoObservable(config)
        }

        @action switchBackend(backendType: BackendType): boolean {
            if(!this.isBackendAvailable(backendType)) {
                return false
            }
            this.config.current = backendType
            this.save()
            return true
        }

        @computed currentBackend(): BackendResult {
            if(this.config.current === BackendType.Restful) {
                return {
                    type: "readonly",
                    backend: new RestfulFileBackend.ReadonlyBackend({baseURI: ""})
                }
            } else if (this.config.current === BackendType.GitHub) {
                const {token, repo, owner, branch, name, email} = this.githubConfig()
                const octokit = new Octokit({auth: token})
                const backend = new OctokitBackend.FileBackend(octokit, {
                    committer: {name, email},
                    target: {repo, owner, branch}
                })
                return {
                    type: "readwrite",
                    backend 
                }
            } else {
                throw new Error(`Invalid backend: ${this.config.current}`)
            }
        }

        @computed githubConfig(): GitHubConfig {
            const config = this.config.github
            if(!config) {
                throw new Error("GitHub config is not available")
            }
            return config
        }

        @computed private isBackendAvailable(backendType: BackendType): boolean {
            if(backendType === BackendType.GitHub && !this.config.github) {
                return false
            }
            return true
        }

        @action setGitHub(config: GitHubConfig) {
            this.config.github = config
            this.save()
        }

        @action clearGitHub() {
            this.config.github = null
            this.save()
        }

        save() {
            this.storage.save(toJS(this.config))
        }
    }

    class StorageAdaptor<T> {
        constructor(private storage: Storage, private key: string) {}

        load(): T | null {
            const value = this.storage[this.key]
            if(!value) {
                return null
            }
            return JSON.parse(value)
        }

        save(config: T) {
            this.storage[this.key] = JSON.stringify(config)
        }
    }

    export module GitHub {
        type GitHubConfigStatePayload = {
            initial: {},
            selectRepo: {
                token: string,
                committer: OctokitBackend.CommitterInfo,
                repoList: OctokitBackend.RepoTarget[]
            },
            selectBranch: {
                token: string,
                committer: OctokitBackend.CommitterInfo,
                owner: string,
                repo: string
                branchList: string[]
            },
            complete: {
                token: string,
                committer: OctokitBackend.CommitterInfo,
                owner: string,
                repo: string
                branch: string
            }
        }
    
        type GitHubConfigStateTypes = keyof GitHubConfigStatePayload
        type GitHubConfigState<N extends GitHubConfigStateTypes> = {
            type: N
        } & GitHubConfigStatePayload[N]
    
        type GitHubConfigStateBase = GitHubConfigState<GitHubConfigStateTypes>
    
        export class GitHubConfigStore {
            @observable state: GitHubConfigStateBase = {type: "initial"}
            @observable pending: boolean = false
            @observable error: string | null = null
    
            private octokit: Octokit | null = null
    
            constructor() {
                makeAutoObservable(this)
            }

            async setToken(token: string) {
                validateState("initial", this.state)
                this.setPending(true)
                try {
                    this.octokit = new Octokit({auth: token})
                    const user = await this.backend.getUserInfo()
                    const repoList = await this.backend.listRepos()
                    this.setStateInternal("selectRepo", {
                        repoList,
                        token,
                        committer: {
                            name: user.displayName,
                            email: user.email
                        }
                    })
                } catch(ex: any) {
                    this.setError(ex)
                }
                this.setPending(false)
            }

            async selectRepo(owner: string, repo: string) {
                validateState("selectRepo", this.state)
                this.setPending(true)
                try {
                    const branchList = await this.backend.listBranches({
                        owner,
                        repo
                    })
                    this.setStateInternal("selectBranch", {
                        token: this.state.token,
                        committer: this.state.committer,
                        owner,
                        repo,
                        branchList
                    })
                }catch(ex: any) {
                    this.setError(ex)
                }
                this.setPending(false)
            }

            async selectBranch(branch: string) {
                validateState("selectBranch", this.state)
                this.setPending(true)
                try {
                    this.setStateInternal("complete", {
                        token: this.state.token,
                        committer: this.state.committer,
                        owner: this.state.owner,
                        repo: this.state.repo,
                        branch
                    })
                }catch(ex: any) {
                    this.setError(ex)
                }
                this.setPending(false)
            }
    
            clear() {
                this.setStateInternal("initial", {})
                this.octokit = null
            }
    
            @action private setStateInternal<N extends GitHubConfigStateTypes>(type: N, payload: GitHubConfigStatePayload[N]) {
                this.state = {type, ...payload}
                this.error = null
            }
    
            @action private setPending(pending: boolean) {
                this.pending = pending
            }

            @action private setError(ex: any) {
                this.error = ex.toString()
            }
    
            private get backend(): OctokitBackend.OctokitAdaptor {
                if(!this.octokit) {
                    throw new Error("Octokit client not available.")
                }
                return new OctokitBackend.OctokitAdaptor(this.octokit)
            }
        }

        function validateState<N extends GitHubConfigStateTypes>(state: N, obj: GitHubConfigStateBase): asserts obj is GitHubConfigState<N> {
            if(obj.type !== state) {
                throw new Error(`Expected state ${state}, got ${obj.type}`)
            }
        }
    }
}