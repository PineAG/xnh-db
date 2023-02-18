import { XnhDBProtocol, OfflinePathClientUtils } from "@xnh-db/protocol";
import { DbUiConfiguration } from "../../config";
import { BackendBase } from "./base";

    export class RestfulPathClient implements OfflinePathClientUtils.IPathClient {
        constructor(private rootPath: string) {}

        async read(path: string): Promise<Blob | null> {
            const res = await fetch(`/${this.rootPath}/${path}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
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
                body: value,
                headers: {
                    "Content-Type": "application/json"
                }
            })
            if(res.status !== 200){
                throw new Error(res.statusText)
            }
        }
        async delete(path: string): Promise<void> {
            const res = await fetch(`/${this.rootPath}/${path}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                }
            })
            if(res.status !== 200){
                throw new Error(res.statusText)
            }
        }
    }

export function createOfflineClientSet<Props extends DbUiConfiguration.DataPropsBase>(config: Props): BackendBase.OfflineClientSet<Props> {
    function clientFactory(path: string) {
        return new RestfulPathClient(`data/${path}`)
    }
    return BackendBase.Path.createOfflineClientSetFromPathFactory(config, clientFactory)
}
