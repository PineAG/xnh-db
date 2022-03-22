import { cropAnimeAvatar, registerArtwork, registerCharacter } from "@xnh-db/register-utils";
import { GONZO, King_Record } from "../../作者";
import { Wentz瑛士, 下田麻美, 松隆子, 胜地凉 } from "../../声优/日语";
import kanata from './kanata.png'
import agito from './agito.jpg'
import wataru from './brave-story-wataru.jpg'
import mitsuru from './brave-story-mitsuru.jpg'

export const 暴力宇宙海贼_亚空间的深渊 = registerArtwork({
    id: 'Miniskirt-Space-Pirates_Abyss-of-Hyperspace',
    props: {
        作品名: '暴力宇宙海贼 亚空间的深渊'
    },
    files: {},
    tags: [],
    rel: {
        创作者: [King_Record],
        角色: []
    }
})

export const 无限彼方 = registerCharacter({
    id: 'Miniskirt-Space-Pirates-mugen-kanata',
    props: {
        '姓名': '无限彼方'
    },
    tags: [],
    files: {
        '立绘': kanata,
        '头像': cropAnimeAvatar(kanata)
    },
    rel: {
        '出处': [暴力宇宙海贼_亚空间的深渊],
        '创作者': [],
        '配音': [下田麻美]
    }
})

export const 勇者物语 = registerArtwork({
    id: 'brave-story-2006',
    props: {
        '作品名': '勇者物语'
    },
    tags: [],
    files: {},
    rel: {
        '创作者': [GONZO],
        '角色': []
    }
})

export const 三谷亘渡 = registerCharacter({
    id: 'brave-story-wataru',
    props: {
        '姓名': '三谷亘渡'
    },
    tags: [],
    files: {
        '立绘': wataru,
        '头像': cropAnimeAvatar(wataru)
    },
    rel: {
        '出处': [勇者物语],
        '创作者': [],
        '配音': [松隆子]
    }
})

export const 芦川美鹤 = registerCharacter({
    id: 'brave-story-mitsuru',
    props: {
        '姓名': '芦川美鹤'
    },
    tags: [],
    files: {
        '立绘': mitsuru,
        '头像': cropAnimeAvatar(mitsuru)
    },
    rel: {
        '出处': [勇者物语],
        '创作者': [],
        '配音': [Wentz瑛士]
    }
}) 

export const 银色头发的阿基德 = registerArtwork({
    id: 'Origin-Spirits-of-the-Past',
    props: {
        '作品名': '银色头发的阿基德'
    },
    tags: [],
    files: {},
    rel: {
        '创作者': [GONZO],
        '角色': []
    }
})

export const 阿基德 = registerCharacter({
    id: 'Origin-Spirits-of-the-Past_agito',
    props: {
        '姓名': '阿基德',
        '变种': '银发'
    },
    tags: [],
    files: {
        '立绘': agito,
        '头像': cropAnimeAvatar(agito)
    },
    rel: {
        '出处': [银色头发的阿基德],
        '创作者': [],
        '配音': [胜地凉]
    }
})

