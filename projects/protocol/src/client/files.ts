import { IOfflineClient } from "./offline"
import { IOnlineClient } from "./online"

export module RemoteFileUtils {
    export async function retrieveRemoteFile(name: string, query: IOnlineClient.Files, local: IOfflineClient.Files, remote: IOfflineClient.Files): Promise<Blob> {
        if(!await query.available(name)) {
            const data = await remote.read(name)
            await local.write(name, data)
        }
        return query.read(name)
    }
}
