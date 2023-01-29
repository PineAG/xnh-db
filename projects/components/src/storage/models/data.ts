import { ArtworkDefinition, CharacterDefinition, CreatorDefinition, IArtwork, ICharacter, ICreator, IOfflineClientSet, IOnlineClientSet, IVoiceActor, RelationPayloads, VoiceActorDefinition } from "@xnh-db/protocol";
import { IdbCollectionWrapper, IdbCollectionOfflineClient, IdbCollectionOnlineClient, IdbCollectionQuery } from "./collection";
import { IdbRelationOnlineClient, IdbRelationOfflineClient, IdbRelationWrapper } from "./relation";
import * as idb from "idb"
import { GlobalStatusWrapper, IdbTagWrapper } from "./global";

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
            character: new IdbRelationWrapper({parent: character, child: character}, RelationPayloads.Inheritance_Definition),
            artwork: new IdbRelationWrapper({parent: artwork, child: artwork}, RelationPayloads.Inheritance_Definition)
        },
        relations: {
            interpersonal: new IdbRelationWrapper({left: character, right: character}, RelationPayloads.Interpersonal_Definition),
            character_artwork: new IdbRelationWrapper({character, artwork}, RelationPayloads.Character_Artwork_Definition),
            artwork_creator: new IdbRelationWrapper({artwork, creator}, RelationPayloads.Artwork_Creator_Definition),
            character_voiceActor: new IdbRelationWrapper({character, voiceActor}, RelationPayloads.Character_VoiceActor_Definition)
        }
    }
}

export function initializeWrappers(db: idb.IDBPDatabase, wrappers: ReturnType<typeof createDBWrappers>) {
    GlobalStatusWrapper.initialize(db)
    IdbTagWrapper.initialize(db)
    for(const c of Object.values(wrappers.collections)) {
        c.onUpgrade(db)
    }
    for(const r of Object.values(wrappers.inheritance)) {
        r.onUpgrade(db)
    }
    for(const r of Object.values(wrappers.relations)){
        r.onUpgrade(db)
    }
}

export async function upgradeWrapperIndices(db: idb.IDBPDatabase, wrappers: ReturnType<typeof createDBWrappers>) {
    for(const c of Object.values(wrappers.collections)) {
        await c.onLaunch(db)
    }
}

export function createOnlineClientsFromIdbInstance(db: idb.IDBPDatabase, wrappers: ReturnType<typeof createDBWrappers>): IOnlineClientSet<IdbCollectionQuery> {
    return {
        collections: {
            character: new IdbCollectionOnlineClient(db, wrappers.collections.character), 
            artwork: new IdbCollectionOnlineClient(db, wrappers.collections.artwork),
            creator: new IdbCollectionOnlineClient(db, wrappers.collections.creator), 
            voiceActor: new IdbCollectionOnlineClient(db, wrappers.collections.voiceActor)
        },
        inheritance: {
            character: new IdbRelationOnlineClient(db, wrappers.inheritance.character),
            artwork: new IdbRelationOnlineClient(db, wrappers.inheritance.artwork)
        },
        relations: {
            interpersonal: new IdbRelationOnlineClient(db, wrappers.relations.interpersonal),
            character_artwork: new IdbRelationOnlineClient(db, wrappers.relations.character_artwork),
            artwork_creator: new IdbRelationOnlineClient(db, wrappers.relations.artwork_creator),
            character_voiceActor: new IdbRelationOnlineClient(db, wrappers.relations.character_voiceActor)
        }
    }
}

export function createOfflineClientsFromIdbInstance(db: idb.IDBPDatabase, wrappers: ReturnType<typeof createDBWrappers>): IOfflineClientSet {
    return {
        collections: {
            character: new IdbCollectionOfflineClient(db, wrappers.collections.character), 
            artwork: new IdbCollectionOfflineClient(db, wrappers.collections.artwork),
            creator: new IdbCollectionOfflineClient(db, wrappers.collections.creator), 
            voiceActor: new IdbCollectionOfflineClient(db, wrappers.collections.voiceActor)
        },
        inheritance: {
            character: new IdbRelationOfflineClient(db, wrappers.inheritance.character),
            artwork: new IdbRelationOfflineClient(db, wrappers.inheritance.artwork)
        },
        relations: {
            interpersonal: new IdbRelationOfflineClient(db, wrappers.relations.interpersonal),
            character_artwork: new IdbRelationOfflineClient(db, wrappers.relations.character_artwork),
            artwork_creator: new IdbRelationOfflineClient(db, wrappers.relations.artwork_creator),
            character_voiceActor: new IdbRelationOfflineClient(db, wrappers.relations.character_voiceActor)
        }
    }
}
