import {XnhDBProtocol as P} from "@xnh-db/protocol"
import {DbUiConfiguration} from "./config"

export module XnhDBConfig {
    export function createConfig() {
        return DbUiConfiguration.makeConfig({
            clients: {
                query: {

                },
                local: {
                    
                },
                remote: {

                }
            }
        })
    }

    export type Config = ReturnType<typeof createConfig>
}
