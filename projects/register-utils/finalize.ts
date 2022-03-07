import fs from 'fs';
import path from 'path';
import {clone} from 'lodash'

import { ImportedArtwork, ImportedCharacter, XNHImportedData } from "@xnh-db/types";
import { union } from "lodash";
import { characterData } from ".";
import { xnhDataRef } from '@xnh-db/types/base';

function flattenItem(data: XNHImportedData) {
    if(data.type === 'character'){
        for(let art of data.value.出处){
            data.value.创作者 = union(data.value.创作者, art.value.创作者)
        }
    }else if(data.type === 'artwork'){
        // pass
    }else if(data.type === 'voice-actor'){
        // pass
    }else if(data.type === 'creator'){
        // pass
    } // never
}

function flattenDependencies(){
    for(let v of characterData.values()){
        flattenItem(v)
    }
}

// type KeysOfArrayValues<T extends {[key:string]: U[]}, U> = {[X in keyof T]: T[X] extends U[] ? X : never}[keyof T] & keyof T & string

function crossInjectImportedItem<
        T extends {value: {[key: string]: any}}, 
        U extends {value: {[key: string]: any}}
    >(obj1: T, key1: string, obj2: U, key2: string) {
        // f**k typescript
    obj1["value"][key1] = union(obj1["value"][key1], [obj2])
    obj2["value"][key2] = union(obj2["value"][key2], [obj1])
}

function injectItem(data: XNHImportedData){
    if(data.type === 'character'){
        for(let art of data.value.出处){
            crossInjectImportedItem(data, '出处', art, '角色')
        }
        for(let creator of data.value.创作者){
            crossInjectImportedItem(data, '创作者', creator, '角色')
        }
    }else if(data.type === 'artwork'){
        for(let creator of data.value.创作者){
            crossInjectImportedItem(data, '创作者', creator, '角色')
        }
    }else if(data.type === 'voice-actor'){
        // pass
    }else if(data.type === 'creator'){

    }
}

function injectDependencies(){
    for(let v of characterData.values()){
        injectItem(v)
    }
}

async function exportJson(outputDir: string){
    await fs.promises.mkdir(outputDir, {recursive: true})
    for(let doc of characterData.values()){
        const keys = xnhDataRef[doc.type]
        const exportData = clone(doc) as any
        for(let k of keys){
            exportData[k] = doc[k].map(x)
        }
    }
}

export async function finalizeRegistration(outputDir: string){
    flattenDependencies()
    injectDependencies()
    if(fs.existsSync(outputDir)){
        await fs.promises.rmdir(outputDir)
    }
    exportJson(path.join(outputDir, 'items'))
}