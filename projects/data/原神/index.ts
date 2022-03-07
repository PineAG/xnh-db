import { registerArtwork, registerCharacter } from "@xnh-db/register-utils";
import { miHoYo } from "../作者";
import { 穆雪婷 } from "../声优/中文";
import { 逢坂良太 } from "../声优/日语";
import { Cristina_Danielle_Valenzuela } from "../声优/英语";

export const 原神 = registerArtwork({
    id: 'genshin-impact',
    props: {
        作品名: "原神",
    },
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
    rel: {
        出处: [原神],
        创作者: [],
        配音: [穆雪婷, 逢坂良太, Cristina_Danielle_Valenzuela]
    }
})
