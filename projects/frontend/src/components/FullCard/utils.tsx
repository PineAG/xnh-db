import React, { CSSProperties } from "react";
import { XNHExportedData } from "@xnh-db/types";
import {Image, Empty, Row, Col, Descriptions} from 'antd'
export type CardComponent<T extends XNHExportedData> = (props: {item: T}) => JSX.Element

export interface NullableImageProps {
    src: string | null
    style?: CSSProperties
}

const imageStyle: CSSProperties = {
    maxWidth: '100%',
    maxHeight: '100%'
}

export function NullableImage(props: NullableImageProps){
    const imageEle = !props.src ? 
        <Empty style={imageStyle}/> : 
        <Image style={imageStyle} src={`data${props.src}`}/>
    const style: CSSProperties = {
        ...props.style,
        overflow: 'hidden',
        placeItems: 'center'
    }
    return <div style={style}>
        {imageEle}
    </div>
}

const propsTableTitleStyle: CSSProperties = {
    fontSize: '3rem',
    textAlign: 'start'
}

const propsTableStyle: CSSProperties = {

}

export type PropsTableDataSource = [string, React.ReactNode, number?][]

export function PropsTable({items, title, column}: {title?: string, items: PropsTableDataSource, column?: number}) {
    const titleEle = title ? <label style={propsTableTitleStyle}>{title}</label> : undefined
    return <Descriptions column={column} bordered title={titleEle} labelStyle={{whiteSpace: 'nowrap'}}>
        {items.map(([k, v, span]) => (
            <Descriptions.Item key={k} span={span} label={k}>{v}</Descriptions.Item>
        ))} 
    </Descriptions>
}
