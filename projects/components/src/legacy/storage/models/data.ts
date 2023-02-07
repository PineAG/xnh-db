import { ArtworkDefinition, CharacterDefinition, CreatorDefinition, IArtwork, ICharacter, ICreator, IOfflineClient, IOfflineClientSet, IOnlineClientSet, IVoiceActor, ProgressResult, RelationPayloads, synchronizeCollection, synchronizeRelation, VoiceActorDefinition, FieldConfig } from "@xnh-db/protocol";
import * as idb from "idb";
import { IdbCollectionOfflineClient, IdbCollectionOnlineClient, IdbCollectionQuery, IdbCollectionWrapper } from "./collection";
import { IdbFileClientWrapper, IdbFileOfflineClient, IdbFileOnlineClient } from "./files";
import { GlobalStatusWrapper, IdbTagWrapper } from "./global";
import { IdbRelationOfflineClient, IdbRelationOnlineClient, IdbRelationWrapper } from "./relation";

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
            interpersonal: new IdbRelationWrapper<{left: ICharacter, right: ICharacter}, RelationPayloads.Interpersonal>({left: character, right: character}, RelationPayloads.Interpersonal_Definition),
            character_artwork: new IdbRelationWrapper<{character: ICharacter, artwork: IArtwork}, RelationPayloads.Character_Artwork>({character, artwork}, RelationPayloads.Character_Artwork_Definition),
            artwork_creator: new IdbRelationWrapper<{artwork: IArtwork, creator: ICreator}, RelationPayloads.Artwork_Creator>({artwork, creator}, RelationPayloads.Artwork_Creator_Definition),
            character_voiceActor: new IdbRelationWrapper<{character: ICharacter, voiceActor: IVoiceActor}, RelationPayloads.Character_VoiceActor>({character, voiceActor}, RelationPayloads.Character_VoiceActor_Definition)
        }
    }
}

export function initializeWrappers(db: idb.IDBPDatabase, wrappers: ReturnType<typeof createDBWrappers>) {
    GlobalStatusWrapper.initialize(db)
    IdbTagWrapper.initialize(db)
    IdbFileClientWrapper.initialize(db)
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

export function createOnlineClientsFromIdbInstance(dbFactory: () => Promise<idb.IDBPDatabase>, wrappers: ReturnType<typeof createDBWrappers>): IOnlineClientSet<IdbCollectionQuery> {
    return {
        collections: {
            character: new IdbCollectionOnlineClient(dbFactory, wrappers.collections.character), 
            artwork: new IdbCollectionOnlineClient(dbFactory, wrappers.collections.artwork),
            creator: new IdbCollectionOnlineClient(dbFactory, wrappers.collections.creator), 
            voiceActor: new IdbCollectionOnlineClient(dbFactory, wrappers.collections.voiceActor)
        },
        inheritance: {
            character: new IdbRelationOnlineClient(dbFactory, wrappers.inheritance.character),
            artwork: new IdbRelationOnlineClient(dbFactory, wrappers.inheritance.artwork)
        },
        relations: {
            interpersonal: new IdbRelationOnlineClient(dbFactory, wrappers.relations.interpersonal),
            character_artwork: new IdbRelationOnlineClient(dbFactory, wrappers.relations.character_artwork),
            artwork_creator: new IdbRelationOnlineClient(dbFactory, wrappers.relations.artwork_creator),
            character_voiceActor: new IdbRelationOnlineClient(dbFactory, wrappers.relations.character_voiceActor)
        },
        files: new IdbFileOnlineClient(dbFactory),
        tags: new IdbTagWrapper.Client(dbFactory)
    }
}

export function createOfflineClientsFromIdbInstance(dbFactory: () => Promise<idb.IDBPDatabase>, wrappers: ReturnType<typeof createDBWrappers>): IOfflineClientSet {
    return {
        collections: {
            character: new IdbCollectionOfflineClient(dbFactory, wrappers.collections.character), 
            artwork: new IdbCollectionOfflineClient(dbFactory, wrappers.collections.artwork),
            creator: new IdbCollectionOfflineClient(dbFactory, wrappers.collections.creator), 
            voiceActor: new IdbCollectionOfflineClient(dbFactory, wrappers.collections.voiceActor)
        },
        inheritance: {
            character: new IdbRelationOfflineClient(dbFactory, wrappers.inheritance.character),
            artwork: new IdbRelationOfflineClient(dbFactory, wrappers.inheritance.artwork)
        },
        relations: {
            interpersonal: new IdbRelationOfflineClient(dbFactory, wrappers.relations.interpersonal),
            character_artwork: new IdbRelationOfflineClient(dbFactory, wrappers.relations.character_artwork),
            artwork_creator: new IdbRelationOfflineClient(dbFactory, wrappers.relations.artwork_creator),
            character_voiceActor: new IdbRelationOfflineClient(dbFactory, wrappers.relations.character_voiceActor)
        },
        files: new IdbFileOfflineClient(dbFactory)
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
            console.log(`Update collection ${k}`)
            const name = names[k]
            for await(const p of synchronizeCollection(src[k], dst[k])) {
                yield [{type: "collection", name}, p]
            }
        }
    }

    async function* onRelations<K extends string>(src: Record<K, IOfflineClient.Relation<any, any>>, dst: Record<K, IOfflineClient.Relation<any, any>>, names: Record<K, string>): AsyncGenerator<[SyncOfflineClientSetProgress, ProgressResult.Progress]> {
        for(const k in names) {
            console.log(`Update relation ${k}`)
            const name = names[k]
            for await(const p of synchronizeRelation(src[k], dst[k])) {
                yield [{type: "relation", name}, p]
            }
        }
    }
}

const ProgressResultActionNames = {
    create: "创建",
    update: "覆盖",
    delete: "删除"
}

export function stringifyProgressResult(progress: ProgressResult.Progress): string {
    if(progress.type === "item"){
        const actionName = ProgressResultActionNames[progress.action.type]
        return `正在 ${actionName} 条目: ${progress.action.id} (${progress.action.progress.current+1}/${progress.action.progress.total})`
    } else if(progress.type === "index") {
        return `正在 ${progress.action === "pull" ? "下载" : "上传"} 条目索引`
    } else {
        const actionName = ProgressResultActionNames[progress.action.type]
        return `正在 ${actionName} 文件: ${progress.action.id} (${progress.action.progress.current+1}/${progress.action.progress.total})`
    }
}
