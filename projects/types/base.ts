import { BaseBase } from "./utils"

export interface CharacterBase extends BaseBase {
    type: 'character'
    props: {
        姓名: string
        变种?: string
    }
    rel: {
        出处: ArtworkBase
        创作者: CreatorBase
        配音: VoiceActorBase
    }
}

export interface ArtworkBase extends BaseBase {
    type: 'artwork'
    props: {
        作品名: string
    }
    rel: {
        创作者: CreatorBase
        角色: CharacterBase
    }
}

export interface VoiceActorBase extends BaseBase {
    type: 'voice-actor'
    props: {
        姓名: string
        性别: '男' | '女'
        语言: '普通话' | '日语' | '英语'
    }
    rel: {
        角色: CharacterBase
    }
}

export interface CreatorBase extends BaseBase {
    type: 'creator'
    props: {
        姓名: string
    }
    rel: {
        角色: CharacterBase
        作品: ArtworkBase
    }
}
