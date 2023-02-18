import { ImageProps, Image as AntdImage, Avatar, AvatarProps, AutoComplete, Empty } from "antd";
import { GlobalSyncComponents } from "../components/sync";
import {AdaptorsConfig as Conf} from "./config"
import {UserOutlined} from "@ant-design/icons"
import {useState, useEffect} from "react"
import { XBinding } from "../components/binding";

export module AntdWrapperUtils {
    type AsyncImageProps = {fileName: string, imageProps: ImageProps}
    export function AsyncImage(props: AsyncImageProps) {
        const url = GlobalSyncComponents.useObjectURL(props.fileName)
        if(!url) {
            return <Empty/>
        }
        return <AntdImage {...props.imageProps} src={url}/>
    }

    type AsyncAvatarProps = {fileName: string | undefined, avatarProps?: AvatarProps}
    export function AsyncAvatar(props: AsyncAvatarProps) {
        const objectURL = GlobalSyncComponents.useObjectURL(props.fileName)
        if(objectURL) {
            return <Avatar
                size={Conf.avatarSize}
                src={objectURL}
                {...props.avatarProps}
            />
        } else {
            return <Avatar
                size={Conf.avatarSize}
                icon={<UserOutlined/>}
                {...props.avatarProps}
            />
        }
    }

    export function useTagValues(tagCollection: string) {
        const clients = GlobalSyncComponents.useQueryClients()
        const [values, setValues] = useState<string[]>([])
        useEffect(() => {
            initialize()
        }, [tagCollection])

        return values
        
        async function initialize() {
            const tags = await clients.tags.getTagsByCollection(tagCollection)
            setValues(tags)
        }
    }

    type TagInputProps = {tagCollection: string, binding: XBinding.Binding<string | undefined>}
    export function TagInput(props: TagInputProps) {
        const allOptions = useTagValues(props.tagCollection)

        const filteredOptions = allOptions.filter(it => !props.binding.value || it.includes(props.binding.value))

        return <AutoComplete
            value={props.binding.value}
            onChange={(value) => props.binding.update(value)}
            options={filteredOptions.map(it => ({label: it, value: it}))}
        />
    }
}