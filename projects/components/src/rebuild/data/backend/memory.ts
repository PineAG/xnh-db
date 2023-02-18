import { OfflinePathClientUtils } from "@xnh-db/protocol";
import { DbUiConfiguration } from "../../config";
import { BackendBase } from "./base";

export class MemoryPathClient implements OfflinePathClientUtils.IPathClient {
    private data = new Map<string, Blob>()

    async read(path: string): Promise<Blob> {
        const out = this.data.get(path)
        if(!out) {
            throw new Error("Not exists: "+path)
        }
        return out
    }
    async write(path: string, value: Blob): Promise<void> {
        this.data.set(path, value)
    }
    async delete(path: string): Promise<void> {
        this.data.delete(path)
    }
}

export function createOfflineClientSet<Props extends DbUiConfiguration.DataPropsBase>(config: Props): BackendBase.OfflineClientSet<Props> {
    const clients = new Map<string, MemoryPathClient>()
    function clientFactory(path: string) {
        let client = clients.get(path)
        if(!client) {
            client = new MemoryPathClient()
            clients.set(path, client)
        }
        return client
    }
    return BackendBase.Path.createOfflineClientSetFromPathFactory(config, clientFactory)
}