import { ImageProps, Image } from "antd";
import { GlobalSyncComponents } from "../components/sync";

export module AntdWrapperUtils {
    type AsyncImageProps = {fileName: string, imageProps: ImageProps}
    export function AsyncImage(props: AsyncImageProps) {
        const url = GlobalSyncComponents.useObjectURL(props.fileName)
        return <Image {...props.imageProps} src={url}/>
    }
}