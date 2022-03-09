export type DataRefType = 'direct' | 'link' | 'wrapped'

export interface BaseBase {
    type: string
    props: {}
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
    value: ConfigData<T>
}
// Exported as JSON
export type ExportData<T extends BaseBase> = {
    id: string
    title: string
    type: T["type"]
    props: T["props"]
    rel: {
        [K in keyof T["rel"]]: 
            {id: string, type: T["rel"][K]["type"], title: string}[]
    }
};
