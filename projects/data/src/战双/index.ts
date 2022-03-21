import { cropAnimeAvatar, registerArtwork, registerCharacter } from "@xnh-db/register-utils";
import { kinsen } from "../声优/中文";
import changyu from './Coating-Kirin-GenericModified.png'

export const 战双帕弥什 = registerArtwork({
    id: 'punishing',
    props: {
        作品名: '战双帕弥什'
    },
    files: {},
    tags: [],
    rel: {
        角色: [],
        创作者: []
    }
})

export const 常羽 = registerCharacter({
    id: 'punishing-changyu',
    props: {
        姓名: '常羽'
    },
    files: {
        立绘: changyu,
        头像: cropAnimeAvatar(changyu)
    },
    tags: [],
    rel: {
        出处: [战双帕弥什],
        创作者: [],
        配音: [kinsen]
    }
})

