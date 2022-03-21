import { cropAnimeAvatar, registerArtwork, registerCharacter } from "@xnh-db/register-utils";
import { miHoYo } from "../作者";
import { kinsen, 穆雪婷 } from "../声优/中文";
import { 逢坂良太 } from "../声优/日语";
import { Cristina_Danielle_Valenzuela } from "../声优/英语";
import xiao from './xiao.png'
import chongyun from './chongyun.png'
import xingqiu from './xingqiu.png'
import gorou from './gorou.png'

export const 原神 = registerArtwork({
    id: 'genshin-impact',
    props: {
        作品名: "原神",
    },
    files: {},
    tags: [],
    rel: {
        创作者: [miHoYo],
        角色: []
    }
})

export const 班尼特 = registerCharacter({
    id: 'genshin-impact-bennett',
    props: {
        姓名: "班尼特",
    },
    files: {
        立绘: null
    },
    tags: [],
    rel: {
        出处: [原神],
        创作者: [],
        配音: [穆雪婷, 逢坂良太, Cristina_Danielle_Valenzuela]
    }
})

export const 雷泽 = registerCharacter({
    id: 'genshin-impact-razor',
    props: {
        姓名: "雷泽",
    },
    files: {
        立绘: null
    },
    tags: [],
    rel: {
        出处: [原神],
        创作者: [],
        配音: []
    }
})

export const 重云 = registerCharacter({
    id: 'genshin-impact-chongyun',
    props: {
        姓名: "重云",
    },
    files: {
        立绘: chongyun,
        头像: cropAnimeAvatar(chongyun)
    },
    tags: [],
    rel: {
        出处: [原神],
        创作者: [],
        配音: [kinsen]
    }
})

export const 行秋 = registerCharacter({
    id: 'genshin-impact-xingqiu',
    props: {
        姓名: "行秋",
    },
    files: {
        立绘: xingqiu,
        头像: cropAnimeAvatar(xingqiu)
    },
    tags: [],
    rel: {
        出处: [原神],
        创作者: [],
        配音: []
    }
})

export const 魈 = registerCharacter({
    id: 'genshin-impact-xiao',
    props: {
        姓名: "魈",
    },
    files: {
        立绘: xiao,
        头像: cropAnimeAvatar(xiao)
    },
    tags: [],
    rel: {
        出处: [原神],
        创作者: [],
        配音: [kinsen]
    }
})

export const 五郎 = registerCharacter({
    id: 'genshin-impact-gorou',
    props: {
        姓名: "五郎",
    },
    files: {
        立绘: gorou,
        头像: cropAnimeAvatar(gorou)
    },
    tags: [],
    rel: {
        出处: [原神],
        创作者: [],
        配音: []
    }
})

export const 枫原万叶 = registerCharacter({
    id: 'genshin-impact-kazuha',
    props: {
        姓名: "枫原万叶",
    },
    files: {
        立绘: null
    },
    tags: [],
    rel: {
        出处: [原神],
        创作者: [],
        配音: []
    }
})
