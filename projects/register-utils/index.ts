import { CharacterConfig, ImportedArtwork, ImportedCharacter, ArtworkConfig, VoiceActorConfig, ImportedVoiceActor, CreatorConfig, ImportedCreator, XNHImportedData } from "@xnh-db/types";

export const characterData: Map<string, XNHImportedData> = new Map()

function registerData<T extends XNHImportedData>(data: T): T {
    const conflictItem = characterData.get(data.id)
    if(conflictItem !== undefined){
        throw new Error(`ID ${data.id} 已存在，已存在项目: ${JSON.stringify(conflictItem)}，传入项目: ${JSON.stringify(data)}, 请更改项目ID`)
    }
    characterData.set(data.id, data)
    return data
}

export function registerCharacter(conf: CharacterConfig): ImportedCharacter {
    return registerData({
        id: conf.id,
        type: 'character',
        value: conf
    })
}

export function registerArtwork(conf: ArtworkConfig): ImportedArtwork {
    return registerData({
        id: conf.id,
        type: 'artwork',
        value: conf
    })
}

export function registerVoiceActor(conf: VoiceActorConfig): ImportedVoiceActor {
    return registerData({
        id: conf.id,
        type: 'voice-actor',
        value: conf
    })
}

export function registerCreator(conf: CreatorConfig): ImportedCreator {
    return registerData({
        id: conf.id,
        type: 'creator',
        value: conf
    })
}

export {finalizeRegistration} from './finalize'
