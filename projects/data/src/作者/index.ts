import { registerCreator } from "@xnh-db/register-utils";

export const miHoYo = registerCreator({
    id: 'mihoyo',
    props: {
        姓名: '米哈游',
    },
    files: {},
    tags: [],
    rel: {
        角色: [],
        作品: []
    }
})