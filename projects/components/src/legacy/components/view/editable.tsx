import { IconButton, Icons, VStack } from "@pltk/components"
import { FieldConfig } from "@xnh-db/protocol"
import { useRef, useState } from "react"
import { useDBClients, XBinding } from "../sync"
import { getBlobFromFile, ImageEditDialog, ImageUploadDialog, useUploadFile } from "./image"
import { PreviewViews } from "./view"
import {Button} from "antd"
import { UploadOutlined } from "@ant-design/icons"

export module EditorViews {
    import FC = FieldConfig.Fields

    type BindingProps<T, Conf extends FieldConfig.EndpointConfig<T>> = {
        binding: XBinding.Binding<T | undefined>
        config: Conf
    }

    export function AvatarEditor(props: BindingProps<string, FC.FileConfig>) {
        const [showUpload, setShowUpload] = useState(false)
        const [fileBlob, setFileBlob] = useState<null | Blob>(null)
        const clients = useDBClients()

        return <div>
            <PreviewViews.AsyncAvatar
                filename={props.binding.value}
                avatarProps={{onClick}}
                size={64}
                icon={<UploadOutlined/>}
            />
            <ImageUploadDialog
                open={showUpload}
                onUpload={blob => {
                    setFileBlob(blob)
                    setShowUpload(false)
                }}
                onCancel={() => setShowUpload(false)}
            />
            <ImageEditDialog
                data={fileBlob}
                onComplete={onComplete}
                onCancel={() => setFileBlob(null)}
            />
        </div>

        function onClick() {
            setShowUpload(true)
        }

        async function onComplete(blob: Blob) {
            if(blob === fileBlob) return;
            const newName = `${crypto.randomUUID()}.webp`
            await clients.query.files.write(newName, blob)
            props.binding.update(newName)
            setFileBlob(null)
        }
    }

    export function ImageListEditor(props: BindingProps<string[], FC.FileListConfig>) {
        const clients = useDBClients()
        const valueBinding = XBinding.defaultValue(props.binding, () => [])
        const imageBindings = XBinding.fromArray(valueBinding)
        const [fileBlob, setFileBlob] = useState<null | Blob>(null)
        const [showUploadDialog, setUploadDialog] = useState(false)
        
        return <>
            <div style={{display: "grid", gridTemplateColumns: "repeat(3, 100px)"}}>
                    <Button
                        type="text"
                        icon={<Icons.Add/>}
                        style={{width: "100px", height: "100px"}} 
                        onClick={() => setUploadDialog(true)}
                    />
                {imageBindings.map(img => {
                    return <VStack layout={["1fr", "auto"]}>
                        <PreviewViews.AsyncImage fileName={img.value} width="100px" height="100px">
                            <IconButton icon={<Icons.Delete/>} onClick={() => img.remove()} style={{position: "absolute", top: 0, right: 0}}/>
                        </PreviewViews.AsyncImage>
                        <Button icon={<Icons.Delete/>} onClick={() => img.remove()} danger>删除</Button>
                    </VStack>
                })}
            </div>
            <ImageUploadDialog
                open={showUploadDialog}
                onUpload={blob => {
                    setFileBlob(blob)
                    setUploadDialog(false)
                }}
                onCancel={() => setUploadDialog(false)}
            />
            <ImageEditDialog
                data={fileBlob}
                onComplete={onComplete}
                onCancel={() => setFileBlob(null)}
            />
        </>

        async function onComplete(blob: Blob) {
            const fileName = `${crypto.randomUUID()}.webp`
            await clients.query.files.write(fileName, blob)
            const newValue = [fileName, ...valueBinding.value]
            console.log(newValue)
            valueBinding.update(newValue)
            props.binding.update(newValue)
            setFileBlob(null)
        }

    }
}