import {XnhDBProtocol as P} from "@xnh-db/protocol"
import {DbUiConfiguration} from "./config"

export module XnhDBConfig {
    export function createConfig() {
        return DbUiConfiguration.makeConfig({
            collections: {
                character: {
                    config: P.CharacterDefinition
                }
            },
            relations: {
                characterArtwork: {
                    collections: {
                        ccc: "233"
                    },
                    payloadConfig: P.RelationPayloads.Character_Artwork_Definition
                }
            }
        })
    }

    export type Config = ReturnType<typeof createConfig>
}
