export interface IGitInitialization {
    name: string
    email: string
    url: string
}

export interface IGitClient {
    gitInitialized(): Promise<boolean>
    initializeGit(user: IGitInitialization): Promise<void>
    isDirty(): Promise<boolean>
    synchronize(): Promise<void>
}
