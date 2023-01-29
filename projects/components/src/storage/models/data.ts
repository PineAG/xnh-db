import { ArtworkDefinition, CharacterDefinition, CreatorDefinition, IArtwork, ICharacter, ICreator, IOfflineClient, IOfflineClientSet, IOnlineClientSet, IVoiceActor, ProgressResult, RelationPayloads, synchronizeCollection, synchronizeRelation, VoiceActorDefinition } from "@xnh-db/protocol";
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

interface SyncOfflineClientSetProgress {
    type: "collection" | "relation"
    name: string
}

export async function* synchronizeOfflineClientSet(srcSet: IOfflineClientSet, destSet: IOfflineClientSet): AsyncGenerator<[SyncOfflineClientSetProgress, ProgressResult.Progress]> {
    yield* onCollections(srcSet.collections, destSet.collections, {
        character: "角色信息",
        artwork: "作品信息",
        creator: "创作者信息",
        voiceActor: "配音演员信息"
    })

    yield* onRelations(srcSet.inheritance, destSet.inheritance, {
        character: "角色继承关系",
        artwork: "作品继承关系"
    })

    yield* onRelations(srcSet.relations, destSet.relations, {
        interpersonal: "角色间关系",
        character_artwork: "角色所属作品",
        artwork_creator: "创作者关系",
        character_voiceActor: "角色配音演员"
    })

    async function* onCollections<K extends string>(src: Record<K, IOfflineClient.Collection<any>>, dst: Record<K, IOfflineClient.Collection<any>>, names: Record<K, string>): AsyncGenerator<[SyncOfflineClientSetProgress, ProgressResult.Progress]> {
        for(const k in names) {
            const name = names[k]
            for await(const p of synchronizeCollection(src[k], dst[k])) {
                yield [{type: "collection", name}, p]
            }
        }
    }

    async function* onRelations<K extends string>(src: Record<K, IOfflineClient.Relation<any, any>>, dst: Record<K, IOfflineClient.Relation<any, any>>, names: Record<K, string>): AsyncGenerator<[SyncOfflineClientSetProgress, ProgressResult.Progress]> {
        for(const k in names) {
            const name = names[k]
            for await(const p of synchronizeRelation(src[k], dst[k])) {
                yield [{type: "relation", name}, p]
            }
        }
    }
}

export function stringifyProgressResult(progress: ProgressResult.Progress): string {
    if(progress.type === "item") {
        const actionName = {
            create: "创建",
            update: "覆盖",
            delete: "删除"
        }[progress.action.type]
        return `正在 ${actionName} 条目: ${progress.action.type} (${progress.action.progress.current}/${progress.action.progress.total})`
    } else {
        return `正在 ${progress.action === "pull" ? "下载" : "上传"} 条目索引`
    }
}
