import { DbUiConfiguration } from "../rebuild"
import { AntdComponents } from "../rebuild/adaptor"
import { XnhArtwork } from "./artwork"
import { XnhCharacter } from "./character"
import { config } from "./config"
import { XnhCreator } from "./creator"
import { XnhArtwork_Creator, XnhCharacter_Artwork, XnhCharacter_VoiceActor, XnhInterpersonal } from "./relations"
import { XnhVoiceActor } from "./voiceActor"

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
            interpersonal: {
                payloadEditor: XnhInterpersonal.payloadEditor,
                relationPreview: XnhInterpersonal.payloadEditor
            },
            artwork_creator: {
                payloadEditor: XnhArtwork_Creator.payloadEditor,
                relationPreview: XnhArtwork_Creator.payloadPreview
            },
            character_artwork: {
                payloadEditor: XnhCharacter_Artwork.payloadEditor,
                relationPreview: XnhCharacter_Artwork.payloadPreview
            },
            character_voiceActor: {
                payloadEditor: XnhCharacter_VoiceActor.payloadEditor,
                relationPreview: XnhCharacter_VoiceActor.payloadPreview
            },
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
            interpersonal: XnhInterpersonal.titles,
            artwork_creator: XnhArtwork_Creator.titles,
            character_artwork: XnhCharacter_Artwork.titles,
            character_voiceActor: XnhCharacter_VoiceActor.titles
        }
    },
    global: AntdComponents
})