import { registerArtwork, registerCharacter } from "@xnh-db/register-utils";
import { miHoYo } from "../作者";
import { kinsen, 穆雪婷 } from "../声优/中文";
import { 逢坂良太 } from "../声优/日语";
import { Cristina_Danielle_Valenzuela } from "../声优/英语";

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
    files: {},
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
    files: {},
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
    files: {},
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
    files: {},
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
    files: {},
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
    files: {},
    tags: [],
    rel: {
        出处: [原神],
        创作者: [],
        配音: []
    }
})

export const 枫原万叶 = registerCharacter({
    id: 'genshin-impact-gorou',
    props: {
        姓名: "枫原万叶",
    },
    files: {},
    tags: [],
    rel: {
        出处: [原神],
        创作者: [],
        配音: []
    }
})
