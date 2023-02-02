import { IOfflineClient, IOnlineClient } from "./client"
import {FieldConfig as FC} from "./client/config"

export type Languages = "zhs" | "ja" | "en"
export type InternationalName = Record<Languages, string>

export const XNH_DB_DATA_VERSION = 1

function createInternationalNameDefinition(): FC.ConfigFromDeclaration<InternationalName> {
    return {
        zhs: FC.fullTextField(1),
        ja: FC.fullTextField(1),
        en: FC.fullTextField(1),
    }
}

export interface ICharacter {
    id: string
    title: string
    name: InternationalName
    profile: string
    photos: string[]
    description: string
    appearance: {
        eyes: {
            color: string[],
            features: string[]
        }
        hair: {
            color: string[],
            shape: string[],
            features: string[]
        }
    }
}

export const CharacterDefinition: FC.ConfigFromDeclaration<ICharacter> = {
    id: FC.id(),
    title: FC.fullTextField(1.5),
    name: createInternationalNameDefinition(),
    profile: FC.file(),
    photos: FC.fileList(),
    description: FC.fullTextField(0.1),
    appearance: {
        eyes: {
            color: FC.tagList("color"),
            features: FC.tagList("eyes.features")
        },
        hair: {
            color: FC.tagList("color"),
            shape: FC.tagList("hair.shape"),
            features: FC.tagList("hair.features")
        }
    },
}

export interface IArtwork {
    id: string
    title: string,
    name: InternationalName
    photos: string[]
    description: string
}

export const ArtworkDefinition: FC.ConfigFromDeclaration<IArtwork> = {
    id: FC.id(),
    title: FC.fullTextField(1.5),
    name: createInternationalNameDefinition(),
    photos: FC.fileList(),
    description: FC.fullTextField(0.1)
}

export interface ICreator {
    id: string
    title: string,
    name: InternationalName
    photos: string[]
    description: string
}

export const CreatorDefinition: FC.ConfigFromDeclaration<ICreator> = {
    id: FC.id(),
    title: FC.fullTextField(1.5),
    name: createInternationalNameDefinition(),
    photos: FC.fileList(),
    description: FC.fullTextField(0.1)
}

export interface IVoiceActor {
    id: string
    title: string,
    name: InternationalName
    photos: string[]
    description: string
}

export const VoiceActorDefinition: FC.ConfigFromDeclaration<IVoiceActor> = {
    id: FC.id(),
    title: FC.fullTextField(1.5),
    name: createInternationalNameDefinition(),
    photos: FC.fileList(),
    description: FC.fullTextField(0.1)
}

/**
 * Character - VoiceActor
 * Character[parent] - Character[child]
 * Character - Artwork - Creator
 * Artwork[parent] - Artwork[child]
 */

export module RelationPayloads {
    export interface Inheritance {}

    export const Inheritance_Definition: FC.ConfigFromDeclaration<Inheritance> = {}

    export interface Character_Artwork {
        characterType: string[]
    }

    export const Character_Artwork_Definition: FC.ConfigFromDeclaration<Character_Artwork> = {
        characterType: FC.tagList("character_artwork.characterType")
    }

    export interface Artwork_Creator {
        creatorType: string[]
    }

    export const Artwork_Creator_Definition: FC.ConfigFromDeclaration<Artwork_Creator> = {
        creatorType: FC.tagList("artwork_creator.creatorType")
    }

    export interface Character_VoiceActor {
        voiceType: string[]
    }

    export const Character_VoiceActor_Definition: FC.ConfigFromDeclaration<Character_VoiceActor> = {
        voiceType: FC.tagList("character_voiceActor.voiceType")
    }

    export interface Interpersonal {
        relation: [string, string]
    }

    export const Interpersonal_Definition: FC.ConfigFromDeclaration<Interpersonal> = {
        relation: FC.tagList("interpersonal.relation")
    }
}

export type IOnlineClientSet<CollectionQuery> = {
    collections: {
        character: IOnlineClient.Collection<ICharacter, CollectionQuery>,
        artwork: IOnlineClient.Collection<IArtwork, CollectionQuery>,
        voiceActor: IOnlineClient.Collection<IVoiceActor, CollectionQuery>,
        creator: IOnlineClient.Collection<ICreator, CollectionQuery>
    },
    inheritance: {
        character: IOnlineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
        artwork: IOnlineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    },
    relations: {
        interpersonal: IOnlineClient.Relation<"left" | "right", RelationPayloads.Interpersonal>
        character_artwork: IOnlineClient.Relation<"character" | "artwork", RelationPayloads.Character_Artwork>
        artwork_creator: IOnlineClient.Relation<"artwork" | "creator", RelationPayloads.Artwork_Creator>
        character_voiceActor: IOnlineClient.Relation<"character" | "voiceActor", RelationPayloads.Character_VoiceActor>
    },
    files: IOnlineClient.Files
    tags: IOnlineClient.Tags
}

export type IOfflineClientSet = {
    collections: {
        character: IOfflineClient.Collection<ICharacter>,
        artwork: IOfflineClient.Collection<IArtwork>,
        voiceActor: IOfflineClient.Collection<IVoiceActor>,
        creator: IOfflineClient.Collection<ICreator>
    },
    inheritance: {
        character: IOfflineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
        artwork: IOfflineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    },
    relations: {
        interpersonal: IOfflineClient.Relation<"left" | "right", RelationPayloads.Interpersonal>
        character_artwork: IOfflineClient.Relation<"character" | "artwork", RelationPayloads.Character_Artwork>
        artwork_creator: IOfflineClient.Relation<"artwork" | "creator", RelationPayloads.Artwork_Creator>
        character_voiceActor: IOfflineClient.Relation<"character" | "voiceActor", RelationPayloads.Character_VoiceActor>
    },
    files: IOfflineClient.Files
}


export async function retrieveRemoteFile(name: string, query: IOnlineClient.Files, local: IOfflineClient.Files, remote: IOfflineClient.Files): Promise<Blob> {
    if(!await query.available(name)) {
        const data = await remote.read(name)
        await local.write(name, data)
    }
    return query.read(name)
}

export type DBDeclaration = {
    character: ICharacter
    artwork: IArtwork
    voiceActor: IVoiceActor
    creator: ICreator
}

export const DBDefinitions: {[K in keyof DBDeclaration]: FC.ConfigFromDeclaration<DBDeclaration[K]>} = {
    character: CharacterDefinition,
    artwork: ArtworkDefinition,
    creator: CreatorDefinition,
    voiceActor: VoiceActorDefinition
}

