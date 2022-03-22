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

export const King_Record = registerCreator({
    id: 'king-record',
    props: {
        '姓名': 'King Record'
    },
    files: {},
    'tags': [],
    rel: {
        '作品': [],
        '角色': []
    }
})

export const GONZO = registerCreator({
    id: 'gonzo',
    props: {
        '姓名': 'GONZO'
    },
    files: {},
    'tags': [],
    rel: {
        '作品': [],
        '角色': []
    }
}) 