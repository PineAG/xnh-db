import { XnhDBProtocol as P } from "@xnh-db/protocol"
import { useContext, createContext } from "react"
import { DBSearch, DbUiConfiguration } from "../rebuild"
import { AntdComponents } from "../rebuild/adaptor"
import { XnhArtwork } from "./artwork"
import { XnhCharacter } from "./character"
import { XnhCreator } from "./creator"
import { XnhRelationsTitles } from "./relations"
import { XnhVoiceActor } from "./voiceActor"

export module XnhUiConfiguration {
    const OpenEntityContext = createContext<(c: string, id: string) => void>(() => {})
    const OpenSearchContext = createContext<(c: string, q: DBSearch.IQuery) => void>(() => {})

    export const config = DbUiConfiguration.makeConfig.withCollections(b => ({
        character: b.createCollectionOfEntity<P.ICharacter>(true).withConfig(P.CharacterDefinition),
        artwork: b.createCollectionOfEntity<P.IArtwork>(true).withConfig(P.ArtworkDefinition),
        voiceActor: b.createCollectionOfEntity<P.IVoiceActor>().withConfig(P.VoiceActorDefinition),
        creator: b.createCollectionOfEntity<P.ICreator>().withConfig(P.VoiceActorDefinition)
    })).withRelations(b => ({
        interpersonal: b.createRelation().ofCollections({
            left: "character",
            right: "character"
            }).withPayload<P.RelationPayloads.Interpersonal>()
            .withPayloadConfig(P.RelationPayloads.Interpersonal_Definition),
        character_artwork: b.createRelation().ofCollections({
            character: "character",
            artwork: "artwork"
            }).withPayload<P.RelationPayloads.Character_Artwork>()
            .withPayloadConfig(P.RelationPayloads.Character_Artwork_Definition),
        artwork_creator: b.createRelation().ofCollections({
            artwork: "artwork",
            creator: "creator"
        }).withPayload<P.RelationPayloads.Artwork_Creator>()
        .withPayloadConfig(P.RelationPayloads.Artwork_Creator_Definition),
        character_voiceActor: b.createRelation().ofCollections({
            character: "character",
            voiceActor: "voiceActor"
        }).withPayload<P.RelationPayloads.Character_VoiceActor>()
        .withPayloadConfig(P.RelationPayloads.Character_VoiceActor_Definition)
    })).collectionsToRelations({
        character: b => ({
            interpersonal_right: b.toRelation("interpersonal", {selfKey: "left", targetKey: "right"}),
            interpersonal_left: b.toRelation("interpersonal", {selfKey: "right", targetKey: "left"}),
            artwork: b.toRelation("character_artwork", {selfKey: "character", targetKey: "artwork"}),
            voiceActor: b.toRelation("character_voiceActor", {selfKey: "character", targetKey: "voiceActor"})
        }),
        artwork: b => ({
            character: b.toRelation("character_artwork", {selfKey: "artwork", targetKey: "character"}),
            creator: b.toRelation("artwork_creator", {selfKey: "artwork", targetKey: "creator"}),
        }),
        voiceActor: b => ({
            character: b.toRelation("character_voiceActor", {selfKey: "voiceActor", targetKey: "character"})
        }),
        creator: b => ({
            artwork: b.toRelation("artwork_creator", {selfKey: "creator", targetKey: "artwork"})
        }),
    }).done()

    export const layouts = DbUiConfiguration.makeDisplayProps(config, {
        layouts: {
            entities: {
                character: {
                    fullPage: XnhCharacter.fullPage,
                    searchResult: XnhCharacter.searchResult,
                    previewItem: XnhCharacter.previewItem,
                },
                creator: {
                    fullPage: XnhCreator.fullPage,
                    searchResult: XnhCreator.searchResult,
                    previewItem: XnhCreator.previewItem,
                },
                artwork: {
                    fullPage: XnhArtwork.fullPage,
                    searchResult: XnhArtwork.searchResult,
                    previewItem: XnhArtwork.previewItem,
                },
                voiceActor: {
                    fullPage: XnhVoiceActor.fullPage,
                    searchResult: XnhVoiceActor.searchResult,
                    previewItem: XnhVoiceActor.previewItem,
                }
            },
            payloads: {
                interpersonal: undefined,
                artwork_creator: undefined,
                character_artwork: undefined,
                character_voiceActor: undefined,
            }
        },
        titles: {
            entityTitles: {
                character: XnhCharacter.CharacterTitles,
                artwork: XnhArtwork.ArtworkTitles,
                creator: XnhCreator.CreatorTitles,
                voiceActor: XnhVoiceActor.VoiceActorTitles,
            },
            payloadTitles: {
                interpersonal: XnhRelationsTitles.Interpersonal,
                artwork_creator: XnhRelationsTitles.Artwork_Creator,
                character_artwork: XnhRelationsTitles.Character_Artwork,
                character_voiceActor: XnhRelationsTitles.Character_VoiceActor
            }
        },
        actions: {
            useOpenItem(collectionName) {
                const openItem = useContext(OpenEntityContext)
                return (itemId) => openItem(collectionName, itemId)
            },
            useOpenSearch(collectionName) {
                const openSearch = useContext(OpenSearchContext)
                return (query) => openSearch(collectionName, query)
            },
        },
        global: AntdComponents
    })
}