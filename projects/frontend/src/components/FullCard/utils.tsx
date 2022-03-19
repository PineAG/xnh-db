import React, { CSSProperties } from "react";
import { XNHExportedData } from "@xnh-db/types";
import {Image, Empty, Row, Col} from 'antd'
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
