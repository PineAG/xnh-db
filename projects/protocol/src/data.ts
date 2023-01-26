import { FieldConfigs as FC } from "./client"

export type Languages = "zhs" | "ja" | "en"
export type InternationalName = Record<Languages, string>

function createInternationalNameDefinition(): FC.ConfigFromDeclaration<InternationalName> {
    return {
        zhs: FC.fullTextField(),
        ja: FC.fullTextField(),
        en: FC.fullTextField(),
    }
}

export interface ICharacter {
    id: string
    name: InternationalName
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
    name: createInternationalNameDefinition(),
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
    name: InternationalName
}

export interface ICreator {
    id: string
    name: InternationalName
}

export interface IVoiceActor {
    id: string
    name: InternationalName
}

/**
 * Character - VoiceActor
 * Character - Artwork - Creator
 */