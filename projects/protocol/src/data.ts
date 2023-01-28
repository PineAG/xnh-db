import {FieldConfig as FC} from "./client/config"

export type Languages = "zhs" | "ja" | "en"
export type InternationalName = Record<Languages, string>

function createInternationalNameDefinition(): FC.ConfigFromDeclaration<InternationalName> {
    return {
        zhs: FC.fullTextField(1),
        ja: FC.fullTextField(1),
        en: FC.fullTextField(1),
    }
}

export interface ICharacter {
    id: string
    title: string,
    name: InternationalName
    photos: string[]
    description: string,
    appearance: {
        eyes: {
            color: string[]
        }
        hair: {
            color: string[]
        }
    }
}

export const CharacterDefinition: FC.ConfigFromDeclaration<ICharacter> = {
    id: FC.id(),
    title: FC.fullTextField(1.5),
    name: createInternationalNameDefinition(),
    photos: FC.fileList(),
    description: FC.fullTextField(0.1),
    appearance: {
        eyes: {
            color: FC.tagList("color")
        },
        hair: {
            color: FC.tagList("color")
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