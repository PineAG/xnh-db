import * as idb from "idb"
import { FieldConfig } from "@xnh-db/protocol";
import { DbUiConfiguration } from "../../../config";
import { BackendBase } from "../base";
import { IdbCollectionOfflineClient, IdbCollectionOnlineClient, IdbCollectionWrapper } from "./collection";
import { IdbFileClientWrapper, IdbFileOfflineClient, IdbFileOnlineClient } from "./files";
import { GlobalStatusWrapper, IdbTagWrapper } from "./global";
import { IdbRelationOnlineClient, IdbRelationOfflineClient, IdbRelationWrapper } from "./relation";

type DPBase = DbUiConfiguration.DataPropsBase

type WrapperSet<Props extends DPBase> = {
    collections: {
        [C in keyof Props["collections"]]: IdbCollectionWrapper<FieldConfig.EntityFromConfig<Props["collections"][C]["config"]>>
    },
    inheritance: {
        [C in keyof Props["collections"]]?: IdbRelationWrapper<{
            parent: FieldConfig.EntityFromConfig<Props["collections"][C]["config"]>,
            child: FieldConfig.EntityFromConfig<Props["collections"][C]["config"]>
        }, {}>
    }
    relations: {
        [R in keyof Props["relations"]]: IdbRelationWrapper<{
            [C in keyof Props["relations"][R]["collections"]]: 
                FieldConfig.EntityFromConfig<
                    Props["collections"][Props["relations"][R]["collections"][C]]["config"]
                        >},
            FieldConfig.EntityFromConfig<Props["relations"][R]["payloadConfig"]>
        >
    }
}

function getWrappersFromConfig<Props extends DPBase>(config: Props): WrapperSet<Props> {
    type Result = WrapperSet<Props>
    
    const collections: Record<string, IdbCollectionWrapper<any>> = {}
    for(const name in config.collections) {
        const entityConf = config.collections[name].config
        const wrapper = new IdbCollectionWrapper(name, entityConf)
        collections[name] = wrapper
    }

    const inheritance: Record<string, IdbRelationWrapper<Record<"parent" | "child", any>, any>> = {}
    for(const name in config.collections) {
        if(!config.collections[name].inheritable) {
            return
        }
        const wrapper = new IdbRelationWrapper({
            parent: collections[name],
            child: collections[name]
        }, {})
        inheritance[name] = wrapper
    }
    
    const relations: Record<string, IdbRelationWrapper<any, any>> = {}
    for(const relName in config.relations) {
        const {collections: relCollections, payloadConfig} = config.relations[relName]
        const internalCollections: Record<string, IdbCollectionWrapper<any>> = {}
        for(const collectionName in relCollections) {
            const realCollectionName = relCollections[collectionName]
            const collectionWrapper = collections[realCollectionName]
            internalCollections[collectionName] = collectionWrapper
        }
        const wrapper = new IdbRelationWrapper(internalCollections, payloadConfig)
        relations[relName] = wrapper
    }

    return {
        collections: collections as Result["collections"],
        inheritance,
        relations: relations as Result["relations"]
    }
}

function initializeWrappers<Props extends DPBase>(db: idb.IDBPDatabase, wrappers: WrapperSet<Props>) {
    GlobalStatusWrapper.initialize(db)
    IdbTagWrapper.initialize(db)
    IdbFileClientWrapper.initialize(db)
    for(const name in wrappers.collections) {
        wrappers.collections[name].onUpgrade(db)
    }
    for(const name in wrappers.inheritance) {
        wrappers.inheritance[name].onUpgrade(db)
    }
    for(const name in wrappers.relations) {
        wrappers.relations[name].onUpgrade(db)
    }
}

async function createDB<Props extends DPBase>(wrappers: WrapperSet<Props>, dbName: string) {
    const db = await idb.openDB(dbName, 1, {
        upgrade: (db, oldVersion, newVersion, tx) => {
            initializeWrappers(db, wrappers)
        }
    })
    return db
}

export function createOnlineClientSet<Props extends DPBase>(config: Props, dbName: string): BackendBase.OnlineClientSet<Props> {
    const wrappers = getWrappersFromConfig(config)

    function dbFactory() {
        return createDB(wrappers, dbName)
    }
    
    const collections: Record<string, IdbCollectionOnlineClient<any>> = {}
    for(const name in wrappers.collections) {
        collections[name] = new IdbCollectionOnlineClient(dbFactory, wrappers.collections[name])
    }

    const inheritance: Record<string, IdbRelationOnlineClient<Record<"parent" | "child", any>, {}>> = {}
    for(const name in wrappers.inheritance) {
        inheritance[name] = new IdbRelationOnlineClient(dbFactory, wrappers.inheritance[name])
    }

    const relations: Record<string, IdbRelationOnlineClient<any, any>> = {}
    for(const name in wrappers.relations) {
        relations[name] = new IdbRelationOnlineClient(dbFactory, wrappers.relations[name])
    }

    const tags = new IdbTagWrapper.Client(dbFactory)
    const files = new IdbFileOnlineClient(dbFactory)

    type Result = BackendBase.OnlineClientSet<Props>
    return {
        collections: collections as Result["collections"],
        inheritance: inheritance as Result["inheritance"],
        relations: relations as Result["relations"],
        tags,
        files
    }
}

export function createOfflineClientSet<Props extends DPBase>(config: Props, dbName: string): BackendBase.OfflineClientSet<Props> {
    const wrappers = getWrappersFromConfig(config)
    function dbFactory() {
        return createDB(wrappers, dbName)
    }
    
    const collections: Record<string, IdbCollectionOfflineClient<any>> = {}
    for(const name in wrappers.collections) {
        collections[name] = new IdbCollectionOfflineClient(dbFactory, wrappers.collections[name])
    }

    const relations: Record<string, IdbRelationOfflineClient<any, any>> = {}
    for(const name in wrappers.relations) {
        relations[name] = new IdbRelationOfflineClient(dbFactory, wrappers.relations[name])
    }

    const files = new IdbFileOfflineClient(dbFactory)

    type Result = BackendBase.OfflineClientSet<Props>
    return {
        collections: collections as Result["collections"],
        relations: relations as Result["relations"],
        files
    }
}


export async function destroyDB(dbName: string) {
    await idb.deleteDB(dbName)
}
