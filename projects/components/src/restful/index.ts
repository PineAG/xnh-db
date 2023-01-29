import { IOfflineClientSet, PathSyncClient } from "@xnh-db/protocol";

export class RestfulPathClient implements PathSyncClient.IPathClient {
    constructor(private rootPath: string) {}

    async read(path: string): Promise<Blob> {
        const res = await fetch(`/${this.rootPath}/${path}`, {
            method: "GET"
        })
        if(res.status === 404) {
            return null
        }else if(res.status === 200){
            return await res.blob()
        }else {
            throw new Error(res.statusText)
        }
    }
    async write(path: string, value: Blob): Promise<void> {
        const res = await fetch(`/${this.rootPath}/${path}`, {
            method: "PUT",
            body: value
        })
        if(res.status !== 200){
            throw new Error(res.statusText)
        }
    }
    async delete(path: string): Promise<void> {
        const res = await fetch(`/${this.rootPath}/${path}`, {
            method: "DELETE"
        })
        if(res.status !== 200){
            throw new Error(res.statusText)
        }
    }
}

export function createRestfulOfflineClientsSet(): IOfflineClientSet {
    return PathSyncClient.createPathOfflineClientSet(path => {
        return new RestfulPathClient(`data/${path}`)
    })
}
