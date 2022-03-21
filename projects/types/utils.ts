export type DataRefType = 'direct' | 'link' | 'wrapped'

export type FileItem = string

export interface BaseBase {
    type: string
    props: {}
    tags: string[]
    files: {[key: string]: null | FileItem | FileItem[]}
    rel: {[key: string]: BaseBase}
}

export interface LinkedData {
    title: string
    id: string
}

export type ArrayBase<T extends {}[]> = T extends (infer Base)[] ? Base : never

// export type DataRef<Type extends DataRefType, BaseArray extends {}[]> = (
//     Type extends 'direct' ? ArrayBase<BaseArray> :
//     Type extends 'link' ? LinkedData :
//     never
// )[]

export type ExcludeKeys<T, K> = Pick<T, Exclude<keyof T, K>>


// Argument sent into register func
export type ConfigData<T extends BaseBase> = {
        id: string
        props: T["props"]
        files: T["files"]
        tags: T["tags"]
        rel: {
            [K in keyof T["rel"]]: 
                ImportData<T["rel"][K]>[]
        }
    };
// Return of register func
export type ImportData<T extends BaseBase> = {
    id: string
    title: string
    type: T["type"]
    files: T["files"]
    tags: T["tags"]
    avatar: null | string
    value: ConfigData<T>
}
// Exported as JSON
export type ExportData<T extends BaseBase> = {
    id: string
    title: string
    type: T["type"]
    files: T["files"]
    tags: T["tags"]
    props: T["props"]
    avatar: null | string
    rel: {
        [K in keyof T["rel"]]: 
            {id: string, type: T["rel"][K]["type"], title: string}[]
    }
};
