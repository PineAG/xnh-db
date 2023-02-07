import { IOfflineClient, IOnlineClient, OfflinePathClientUtils } from "./client"
import {FieldConfig} from "./client/config"
export module XnhDBProtocol {
    const F = FieldConfig.Fields

    export type Languages = "zhs" | "ja" | "en"
    export type InternationalName = Record<Languages, string>

    export const XNH_DB_DATA_VERSION = 1

    function createInternationalNameDefinition(): FieldConfig.ConfigFromDeclaration<InternationalName> {
        return {
            zhs: F.fullTextField(1),
            ja: F.fullTextField(1),
            en: F.fullTextField(1),
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

    export const CharacterDefinition = FieldConfig.makeConfig.for<ICharacter>().as({
        id: F.id(),
        title: F.fullTextField(1.5),
        name: createInternationalNameDefinition(),
        profile: F.file(),
        photos: F.fileList(),
        description: F.fullTextField(0.1),
        appearance: {
            eyes: {
                color: F.tagList("color"),
                features: F.tagList("eyes.features")
            },
            hair: {
                color: F.tagList("color"),
                shape: F.tagList("hair.shape"),
                features: F.tagList("hair.features")
            }
        },
    })

    export interface IArtwork {
        id: string
        title: string,
        name: InternationalName
        photos: string[]
        description: string
    }

    export const ArtworkDefinition = FieldConfig.makeConfig.for<IArtwork>().as({
        id: F.id(),
        title: F.fullTextField(1.5),
        name: createInternationalNameDefinition(),
        photos: F.fileList(),
        description: F.fullTextField(0.1)
    })

    export interface ICreator {
        id: string
        title: string,
        name: InternationalName
        photos: string[]
        description: string
    }

    export const CreatorDefinition = FieldConfig.makeConfig.for<ICreator>().as({
        id: F.id(),
        title: F.fullTextField(1.5),
        name: createInternationalNameDefinition(),
        photos: F.fileList(),
        description: F.fullTextField(0.1)
    })

    export interface IVoiceActor {
        id: string
        title: string,
        name: InternationalName
        photos: string[]
        description: string
    }

    export const VoiceActorDefinition = FieldConfig.makeConfig.for<IVoiceActor>().as({
        id: F.id(),
        title: F.fullTextField(1.5),
        name: createInternationalNameDefinition(),
        photos: F.fileList(),
        description: F.fullTextField(0.1)
    })

    /**
     * Character - VoiceActor
     * Character[parent] - Character[child]
     * Character - Artwork - Creator
     * Artwork[parent] - Artwork[child]
     */

    export namespace RelationPayloads {
        export interface Inheritance {}

        export const Inheritance_Definition = FieldConfig.makeConfig.for<Inheritance>().as({})

        export interface Character_Artwork {
            characterType: string[]
        }

        export const Character_Artwork_Definition = FieldConfig.makeConfig.for<Character_Artwork>().as({
            characterType: F.tagList("character_artwork.characterType")
        })

        export interface Artwork_Creator {
            creatorType: string[]
        }

        export const Artwork_Creator_Definition = FieldConfig.makeConfig.for<Artwork_Creator>().as({
            creatorType: F.tagList("artwork_creator.creatorType")
        })

        export interface Character_VoiceActor {
            voiceType: string[]
        }

        export const Character_VoiceActor_Definition = FieldConfig.makeConfig.for<Character_VoiceActor>().as({
            voiceType: F.tagList("character_voiceActor.voiceType")
        })

        export interface Interpersonal {
            relation: [string, string]
        }

        export const Interpersonal_Definition = FieldConfig.makeConfig.for<Interpersonal>().as({
            relation: F.tagList("interpersonal.relation")
        })
    }

    export namespace RelationKeys {
        export type Inheritance = "parent" | "child"
        export type Interpersonal = "left" | "right"
        export type Character_Artwork = "character" | "artwork"
        export type Artwork_Creator = "artwork" | "creator"
        export type Character_VoiceActor = "character" | "voiceActor"
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

    export type DBDeclaration = {
        character: ICharacter
        artwork: IArtwork
        voiceActor: IVoiceActor
        creator: ICreator
    }

    export const DBDefinitions: {[K in keyof DBDeclaration]: FieldConfig.ConfigFromDeclaration<DBDeclaration[K]>} = {
        character: CharacterDefinition,
        artwork: ArtworkDefinition,
        creator: CreatorDefinition,
        voiceActor: VoiceActorDefinition
    }


    export type PathClientFactory = (root: string) => OfflinePathClientUtils.IPathClient
    export function createPathOfflineClientSet(factory: PathClientFactory): IOfflineClientSet {
        const {Collection, Relation, Files} = OfflinePathClientUtils
        return {
            collections: {
                character: new Collection(factory("characters")),
                artwork: new Collection(factory("artworks")),
                creator: new Collection(factory("creators")),
                voiceActor: new Collection(factory("voiceActors")),
            },
            inheritance: {
                character: new Relation(factory("inherit_character")),
                artwork: new Relation(factory("inherit_artwork")),
            },
            relations: {
                interpersonal: new Relation(factory("rel_interpersonal")),
                character_artwork: new Relation(factory("rel_character_artwork")),
                character_voiceActor: new Relation(factory("rel_character_voiceActor")),
                artwork_creator: new Relation(factory("rel_artwork_creator"))
            },
            files: new Files(factory("files"))
        }
    }
}