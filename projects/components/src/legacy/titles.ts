import { XnhDBProtocol as P, FieldConfig } from "@xnh-db/protocol";

export module XnhDBTitles {
    export type Title<T> = T extends number | string | (number | string)[] ?
        string :
        T extends Record<string, any> ?
        { [K in keyof T]: Title<T[K]> } & { $title: string } :
        never

    export const Character: Title<P.ICharacter> = {
        $title: "角色",
        id: "ID",
        title: "标题",
        name: {
            $title: "姓名",
            zhs: "中文名",
            en: "英文名",
            ja: "日文名"
        },
        description: "描述",
        profile: "头像",
        photos: "照片",
        appearance: {
            $title: "外貌",
            eyes: {
                $title: "眼睛",
                color: "瞳色",
                features: "眼睛特征"
            },
            hair: {
                $title: "头发",
                color: "发色",
                shape: "发型",
                features: "头发特征"
            }
        }
    }

    export const Artwork: Title<P.IArtwork> = {
        $title: "作品",
        id: "ID",
        title: "标题",
        name: {
            $title: "名称",
            zhs: "中文名",
            en: "英文名",
            ja: "日文名"
        },
        description: "描述",
        photos: "照片",
    }

    export const VoiceActor: Title<P.IVoiceActor> = {
        $title: "配音演员",
        id: "ID",
        title: "标题",
        name: {
            $title: "名称",
            zhs: "中文名",
            en: "英文名",
            ja: "日文名"
        },
        description: "描述",
        photos: "照片",
    }

    export const Creator: Title<P.ICreator> = {
        $title: "创作者",
        id: "ID",
        title: "标题",
        name: {
            $title: "名称",
            zhs: "中文标题",
            en: "英文标题",
            ja: "日文标题"
        },
        description: "描述",
        photos: "照片",
    }

    export const titles: {[K in keyof P.DBDeclaration]: Title<P.DBDeclaration[K]>} = {
        character: Character,
        artwork: Artwork,
        voiceActor: VoiceActor,
        creator: Creator
    }

    export function stringifyPath(path: string[]): string {
        return path.join("_")
    }

    export function flattenTitlesByConfig<T>(titles: Title<T>, conf: FieldConfig.ConfigFromDeclaration<T>): Record<string, string> {
        const result: Record<string, string> = {}
        walk([], titles, conf)
        return result

        function walk(path: string[], t: any, c: any) {
            if(t === undefined) {
                return
            }else if(FieldConfig.Fields.isFieldConfig(c)) {
                result[stringifyPath(path)] = t
            } else {
                result[stringifyPath(path)] = t["$title"]
                for(const k in c) {
                    walk([...path, k], t[k], c[k])
                }
            }
        }
    }
}