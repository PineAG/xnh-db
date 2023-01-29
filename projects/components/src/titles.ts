import { ICharacter, IArtwork, ICreator, IVoiceActor } from "@xnh-db/protocol";

type Title<T> = T extends number | string | (number|string)[] ?
    string :
    T extends Record<string, any> ?
    {[K in keyof T]: Title<T[K]>} :
    never

export module ConfigTitles {
    export const Character: Title<ICharacter> = {
        id: "ID",
        title: "标题",
        name: {
            zhs: "中文名",
            en: "英文名",
            ja: "日文名"
        },
        description: "描述",
        photos: "照片",
        appearance: {
            eyes: {
                color: "瞳色",
                features: "眼睛特征"
            },
            hair: {
                color: "发色",
                shape: "发型",
                features: "头发特征"
            }
        }
    }

    export const Artwork: Title<IArtwork> = {
        id: "ID",
        title: "标题",
        name: {
            zhs: "中文名",
            en: "英文名",
            ja: "日文名"
        },
        description: "描述",
        photos: "照片",
    }

    export const VoiceActor: Title<IVoiceActor> = {
        id: "ID",
        title: "标题",
        name: {
            zhs: "中文名",
            en: "英文名",
            ja: "日文名"
        },
        description: "描述",
        photos: "照片",
    }

    export const Creator: Title<ICreator> = {
        id: "ID",
        title: "标题",
        name: {
            zhs: "中文标题",
            en: "英文标题",
            ja: "日文标题"
        },
        description: "描述",
        photos: "照片",
    }
}
