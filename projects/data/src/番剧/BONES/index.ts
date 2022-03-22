import { cropAnimeAvatar, registerArtwork, registerCharacter, registerCreator } from "@xnh-db/register-utils";
import { 中村绘里子 } from "../../声优/日语";

import furouta from './furouta.jpg'

export const BONES = registerCreator({
    'id': 'bones',
    props: {
        '姓名': 'BONES'
    },
    files: {},
    tags: [],
    rel: {
        '作品': [],
        '角色': []
    }
})

export const 超人幻想 = registerArtwork({
    'id': 'concrate-revolution',
    props: {
        '作品名': '超人幻想'
    },
    files: {},
    tags: [],
    rel: {
        '创作者': [BONES],
        '角色': []
    }
})

export const 风郎太 = registerCharacter({
    id: 'furouta',
    props: {
        '姓名': '风郎太'
    },
    files: {
        '立绘': furouta,
        '头像': cropAnimeAvatar(furouta)
    },
    tags: [],
    rel: {
        '出处': [超人幻想],
        '创作者': [],
        '配音': [中村绘里子]
    }
})


