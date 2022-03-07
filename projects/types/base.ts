import { BaseBase } from "./utils"

export type XNHDataType = 'character' | 'artwork' | 'voice-actor' | 'creator'

export interface CharacterBase extends BaseBase {
    props: {
        姓名: string
        变种?: string
    }
    rel: {
        出处: 'artwork' & XNHDataType
        创作者: 'creator' & XNHDataType
        配音: 'voice-actor' & XNHDataType
    }
}


export type CharacterDataRef = ('出处' | '配音' | '创作者') & (keyof CharacterBase)
export const characterDataRef: CharacterDataRef[] = ['出处', '配音', '创作者']

export interface ArtworkBase extends BaseBase {
    props: {
        作品名: string
    }
    rel: {
        创作者: 'creator' & XNHDataType
        角色: 'character' & XNHDataType
    }
}

export type ArtworkDataRef = ('角色' | '创作者') & (keyof ArtworkBase)
export const artworkDataRef: ArtworkDataRef[] = ['角色', '创作者']

export interface VoiceActorBase extends BaseBase {
    props: {
        姓名: string
        性别: '男' | '女'
        语言: '普通话' | '日语' | '英语'
    }
    rel: {
        角色: 'character' & XNHDataType
    }
}

export type VoiceActorDataRef = keyof VoiceActorBase["rel"]
export const voicedActorDataRef: VoiceActorDataRef[] = ['角色']

export interface CreatorBase extends BaseBase {
    props: {
        姓名: string
    }
    rel: {
        角色: 'character' & XNHDataType
        作品: 'artwork' & XNHDataType
    }
}

export type CreatorDataRef = keyof CreatorBase["rel"]
export const creatorDataRef: CreatorDataRef[] = ['角色', '作品']

export const xnhDataRef = {
    character: characterDataRef,
    artwork: artworkDataRef,
    'voice-actor': voicedActorDataRef,
    creator: creatorDataRef
}

export type XNHTypeBase<K extends XNHDataType> = (
    K extends 'character' ? CharacterBase :
    K extends 'artwork' ? ArtworkBase :
    K extends 'voice-actor' ? VoiceActorBase :
    K extends 'creator' ? CreatorBase :
    never
)

export type XNHDataRef<K extends XNHDataType> = (
    K extends 'character' ? CharacterDataRef :
    K extends 'artwork' ? ArtworkDataRef :
    K extends 'voice-actor' ? VoiceActorDataRef :
    K extends 'creator' ? CreatorDataRef :
    never
)
