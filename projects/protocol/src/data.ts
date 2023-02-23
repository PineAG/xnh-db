import {FieldConfig} from "./client/config"
export module XnhDBProtocol {
    const F = FieldConfig.Fields

    export type Languages = "zhs" | "ja" | "en"
    export type InternationalName = Record<Languages, string>

    export const XNH_DB_DATA_VERSION = 1

    function createInternationalNameDefinition(): FieldConfig.ConfigFromDeclaration<InternationalName> {
        return {
            zhs: F.fullText(1),
            ja: F.fullText(1),
            en: F.fullText(1),
        }
    }

    export type IBase = FieldConfig.AsEntity<{
        id: string
        title: string
        name: InternationalName
        profile: string
        photos: string[]
        description: string
    }>

    export const BaseConfig = FieldConfig.makeConfig.for<IBase>().as({
        id: F.id(),
        title: F.fullText(1.5),
        name: createInternationalNameDefinition(),
        profile: F.avatar(),
        photos: F.gallery(),
        description: F.fullText(0.1, true),
    })

    export type ICharacter = FieldConfig.AsEntity<IBase & {
        gender: string[],
        personality: {
            features: string[],
        },
        appearance: {
            age: string[],
            body: {
                height: string[],
                features: string[],
            }
            eyes: {
                color: string[],
                features: string[]
            }
            hair: {
                color: string[],
                shape: string[],
                features: string[]
            },
            wearing: {
                cloths: string[]
                mainColor: string[]
                detailedColor: string[]
                attachments: string[]
            }
            attachments: string[]
        },
        voice: {
            age: string[],
            features: string[],
        }
    }>

    export const CharacterDefinition = FieldConfig.makeConfig.for<ICharacter>().as({
        ...BaseConfig,
        gender: F.tagList("character.gender"),
        personality: {
            features: F.tagList("character.personality.features"),
        },
        appearance: {
            age: F.tagList("character.age"),
            body: {
                height: F.tagList("character.body.height"),
                features: F.tagList("character.body.features"),
            },
            eyes: {
                color: F.tagList("color"),
                features: F.tagList("eyes.features")
            },
            hair: {
                color: F.tagList("color"),
                shape: F.tagList("hair.shape"),
                features: F.tagList("hair.features")
            },
            wearing: {
                cloths: F.tagList("cloths"),
                mainColor: F.tagList("color"),
                detailedColor: F.tagList("color"),
                attachments: F.tagList("cloth.attachments")
            },
            attachments: F.tagList("body.attachments")
        },
        voice: {
            age: F.tagList("character.age"),
            features: F.tagList("character.voice.features"),
        }
    })

    export type IArtwork = FieldConfig.AsEntity<IBase & {
        id: string
        title: string,
        name: InternationalName
        photos: string[]
        description: string
    }>

    export const ArtworkDefinition = FieldConfig.makeConfig.for<IArtwork>().as({
        ...BaseConfig,
    })

    export type ICreator = FieldConfig.AsEntity<IBase & {
        id: string
        title: string,
        name: InternationalName
        photos: string[]
        description: string
    }>

    export const CreatorDefinition = FieldConfig.makeConfig.for<ICreator>().as({
        ...BaseConfig,
    })

    export type IVoiceActor = FieldConfig.AsEntity<IBase & {
        id: string
        title: string,
        name: InternationalName
        photos: string[]
        description: string
        gender: string[]
    }> 

    export const VoiceActorDefinition = FieldConfig.makeConfig.for<IVoiceActor>().as({
        ...BaseConfig,
        gender: F.tagList("voiceActor.gender")
    })

    /**
     * Character - VoiceActor
     * Character[parent] - Character[child]
     * Character - Artwork - Creator
     * Artwork[parent] - Artwork[child]
     */

    export namespace RelationPayloads {
        export type Inheritance = FieldConfig.AsEntity<{}>

        export const Inheritance_Definition = FieldConfig.makeConfig.for<Inheritance>().as({})

        export type Character_Artwork = FieldConfig.AsEntity<{
            characterType: string[]
        }>

        export const Character_Artwork_Definition = FieldConfig.makeConfig.for<Character_Artwork>().as({
            characterType: F.tagList("character_artwork.characterType")
        })

        export type Artwork_Creator = FieldConfig.AsEntity<{
            creatorType: string[]
        }> 

        export const Artwork_Creator_Definition = FieldConfig.makeConfig.for<Artwork_Creator>().as({
            creatorType: F.tagList("artwork_creator.creatorType")
        })

        export type Character_VoiceActor = FieldConfig.AsEntity<{
            voiceType: string[]
        }>

        export const Character_VoiceActor_Definition = FieldConfig.makeConfig.for<Character_VoiceActor>().as({
            voiceType: F.tagList("character_voiceActor.voiceType")
        })

        export type Interpersonal = FieldConfig.AsEntity<{
            leftRelation: string
            rightRelation: string
        }>

        export const Interpersonal_Definition = FieldConfig.makeConfig.for<Interpersonal>().as({
            leftRelation: F.tagList("interpersonal.relation"),
            rightRelation: F.tagList("interpersonal.relation"),
        })
    }

    export namespace RelationKeys {
        export type Inheritance = "parent" | "child"
        export type Interpersonal = "left" | "right"
        export type Character_Artwork = "character" | "artwork"
        export type Artwork_Creator = "artwork" | "creator"
        export type Character_VoiceActor = "character" | "voiceActor"
    }

    // export type IOnlineClientSet<CollectionQuery> = {
    //     collections: {
    //         character: IOnlineClient.Collection<ICharacter, CollectionQuery>,
    //         artwork: IOnlineClient.Collection<IArtwork, CollectionQuery>,
    //         voiceActor: IOnlineClient.Collection<IVoiceActor, CollectionQuery>,
    //         creator: IOnlineClient.Collection<ICreator, CollectionQuery>
    //     },
    //     inheritance: {
    //         character: IOnlineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    //         artwork: IOnlineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    //     },
    //     relations: {
    //         interpersonal: IOnlineClient.Relation<"left" | "right", RelationPayloads.Interpersonal>
    //         character_artwork: IOnlineClient.Relation<"character" | "artwork", RelationPayloads.Character_Artwork>
    //         artwork_creator: IOnlineClient.Relation<"artwork" | "creator", RelationPayloads.Artwork_Creator>
    //         character_voiceActor: IOnlineClient.Relation<"character" | "voiceActor", RelationPayloads.Character_VoiceActor>
    //     },
    //     files: IOnlineClient.Files
    //     tags: IOnlineClient.Tags
    // }

    // export type IOfflineClientSet = {
    //     collections: {
    //         character: IOfflineClient.Collection<ICharacter>,
    //         artwork: IOfflineClient.Collection<IArtwork>,
    //         voiceActor: IOfflineClient.Collection<IVoiceActor>,
    //         creator: IOfflineClient.Collection<ICreator>
    //     },
    //     inheritance: {
    //         character: IOfflineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    //         artwork: IOfflineClient.Relation<"parent" | "child", RelationPayloads.Inheritance>
    //     },
    //     relations: {
    //         interpersonal: IOfflineClient.Relation<"left" | "right", RelationPayloads.Interpersonal>
    //         character_artwork: IOfflineClient.Relation<"character" | "artwork", RelationPayloads.Character_Artwork>
    //         artwork_creator: IOfflineClient.Relation<"artwork" | "creator", RelationPayloads.Artwork_Creator>
    //         character_voiceActor: IOfflineClient.Relation<"character" | "voiceActor", RelationPayloads.Character_VoiceActor>
    //     },
    //     files: IOfflineClient.Files
    // }

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
}