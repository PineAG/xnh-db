export interface IGitUser {
    name: string
    email: string
}

export interface IGitClient {
    getUser(): Promise<IGitUser>
    setUser(user: IGitUser): Promise<void>
    isDirty(): Promise<boolean>
    synchronize(): Promise<void>
}
