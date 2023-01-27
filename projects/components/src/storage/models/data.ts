import { ArtworkDefinition, CharacterDefinition, CreatorDefinition, IArtwork, ICharacter, ICreator, IVoiceActor, VoiceActorDefinition } from "@xnh-db/protocol";
import { IdbCollectionClient, IdbCollectionWrapper } from "./collection";
import { IdbRelationClient, IdbRelationWrapper } from "./relation";
import * as idb from "idb"

export function createDBWrappers() {
    const character = new IdbCollectionWrapper<ICharacter>("characters", CharacterDefinition)
    const artwork = new IdbCollectionWrapper<IArtwork>("artworks", ArtworkDefinition)
    const creator = new IdbCollectionWrapper<ICreator>("creators", CreatorDefinition)
    const voiceActor = new IdbCollectionWrapper<IVoiceActor>("voice_actors", VoiceActorDefinition)
    return {
        collections: {
            character, artwork,
            creator, voiceActor
        },
        inheritance: {
            character: new IdbRelationWrapper({parent: character, child: character}),
            artwork: new IdbRelationWrapper({parent: artwork, child: artwork})
        },
        relations: {
            character_artwork: new IdbRelationWrapper({character, artwork}),
            artwork_creator: new IdbRelationWrapper({artwork, creator}),
            character_voiceActor: new IdbRelationWrapper({character, voiceActor})
        }
    }
}

export function createDBClientsFromIdbInstance(db: idb.IDBPDatabase, wrappers: ReturnType<typeof createDBWrappers>) {
    return {
        collections: {
            character: new IdbCollectionClient(db, wrappers.collections.character), 
            artwork: new IdbCollectionClient(db, wrappers.collections.artwork),
            creator: new IdbCollectionClient(db, wrappers.collections.creator), 
            voiceActor: new IdbCollectionClient(db, wrappers.collections.voiceActor)
        },
        inheritance: {
            character: new IdbRelationClient(db, wrappers.inheritance.character),
            artwork: new IdbRelationClient(db, wrappers.inheritance.artwork)
        },
        relations: {
            character_artwork: new IdbRelationClient(db, wrappers.relations.character_artwork),
            artwork_creator: new IdbRelationClient(db, wrappers.relations.artwork_creator),
            character_voiceActor: new IdbRelationClient(db, wrappers.relations.character_voiceActor)
        }
    }
}
