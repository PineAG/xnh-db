import { XnhDBProtocol as P } from "@xnh-db/protocol";
import { DbUiConfiguration } from "../rebuild";

export const config = DbUiConfiguration.makeConfig.withCollections(b => ({
    character: b.createCollectionOfEntity<P.ICharacter>(true).withConfig(P.CharacterDefinition),
    artwork: b.createCollectionOfEntity<P.IArtwork>(true).withConfig(P.ArtworkDefinition),
    voiceActor: b.createCollectionOfEntity<P.IVoiceActor>().withConfig(P.VoiceActorDefinition),
    creator: b.createCollectionOfEntity<P.ICreator>().withConfig(P.CreatorDefinition)
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