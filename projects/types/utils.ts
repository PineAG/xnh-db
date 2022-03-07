import { XNHDataRef, XNHDataType, XNHTypeBase } from "./base"

export type DataRefType = 'direct' | 'link' | 'wrapped'

export interface BaseBase {
    props: {}
    rel: {}
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
export type ConfigData<DataType extends XNHDataType> = (
    {id: string} & // attachments
    ExcludeKeys<XNHTypeBase<DataType>, XNHDataRef<DataType>> &
    {
        [K in XNHDataRef<DataType> & (keyof XNHTypeBase<DataType>)]: 
            ImportData<XNHTypeBase<DataType>[K] & XNHDataType>[]
    });
// Return of register func
export type ImportData<DataType extends XNHDataType> = {
    id: string,
    type: DataType,
    value: ConfigData<DataType>
}
// Exported as JSON
export type ExportData<DataType extends XNHDataType> = {type: DataType} & ConfigData<DataType>
