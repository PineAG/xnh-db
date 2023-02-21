import { ImageProps, Image as AntdImage, Avatar, AvatarProps, AutoComplete, Empty, Button, Popconfirm } from "antd";
import { GlobalSyncComponents } from "../components/sync";
import {AdaptorsConfig as Conf} from "./config"
import {DeleteOutlined, PlusOutlined, UserOutlined} from "@ant-design/icons"
import {useState, useEffect} from "react"
import { XBinding } from "../components/binding";
import { Flex } from "../components";
import { AntdUpload } from "./upload";

export module AntdWrapperUtils {
    type AsyncImageProps = {fileName: string, imageProps: ImageProps, gallery?: boolean}
    export function AsyncImage(props: AsyncImageProps) {
        const url = GlobalSyncComponents.useObjectURL(props.fileName)
        if(!url) {
            return props.gallery ? <></> : <Empty/>
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
            style={{width: "100%"}}
            value={props.binding.value}
            onChange={(value) => props.binding.update(value)}
            options={filteredOptions.map(it => ({label: it, value: it}))}
        />
    }

    type GalleryViewProps = {fileNames: string[] | undefined, imageProps?: ImageProps}
    export function GalleryView(props: GalleryViewProps) {
        const [visible, setVisible] = useState(false)
        if(!props.fileNames || props.fileNames.length === 0) {
            return <Empty/>
        }
        return <>
            <AsyncImage
                fileName={props.fileNames[0]}
                imageProps={{
                    preview: { visible: false },
                    width: "100%",
                    onClick: () => setVisible(true),
                    ...props.imageProps
                }}
            />
            <div style={{ display: 'none' }}>
            <AntdImage.PreviewGroup preview={{ visible, onVisibleChange: (vis) => setVisible(vis) }}>
                {props.fileNames.map(fp => (
                    <AsyncImage fileName={fp} key={fp} imageProps={{}}/>
                ))}
            </AntdImage.PreviewGroup>
            </div>
        </>
    }

    type GalleryEditorProps = {binding: XBinding.Binding<string[] | undefined>, imageProps?: ImageProps}
    export function GalleryEditor(props: GalleryEditorProps) {
        const tileWidth = 100
        const tileHeight = 100
        const [uploadDialog, setUploadDialog] = useState(false)
        const arrayBinding = XBinding.fromArray(XBinding.defaultValue(props.binding, () => []))
        return <>
        <Flex direction="horizontal" spacing={8} style={{maxWidth: 500}}>
            <div style={{width: tileWidth, height: tileHeight, display: "grid", placeItems: "center"}}>
                <Button icon={<PlusOutlined/>} onClick={() => setUploadDialog(true)}/>
            </div>
            {arrayBinding.map(item => (
                <div key={item.value} style={{width: tileWidth, height: tileHeight, display: "block", position: "relative"}}>
                    <div style={{overflow: "hidden", display: "grid", width: tileWidth, height: tileHeight, placeItems: "center", position: "absolute"}}>
                        <AsyncImage fileName={item.value} imageProps={{}}/>
                    </div>
                    <Flex
                        style={{
                            position: "absolute",
                            right: 0,
                            bottom: 0
                        }}>
                        <Popconfirm
                            title="删除图片"
                            onConfirm={() => item.remove()}
                            >
                            <Button
                                icon={<DeleteOutlined/>}
                                type="text"
                                
                            />
                        </Popconfirm>
                    </Flex>
                </div>
            ))}
        </Flex>
        <AntdUpload.ImageUploadDialog
            open={uploadDialog}
            onUpload={(fp) => {
                props.binding.update([
                    fp,
                    ...(props.binding.value ?? [])
                ])
                setUploadDialog(false)
            }}
            onCancel={() => {
                setUploadDialog(false)
            }}
        />
        </>
    }
}