import { IconButton, Icons } from "@pltk/components"
import { FieldConfig as FC, FieldConfig } from "@xnh-db/protocol"
import { useRef, useState } from "react"
import { useDBClients, XBinding } from "../sync"
import { getBlobFromFile, ImageEditDialog, ImageUploadDialog, useUploadFile } from "./image"
import { PreviewViews } from "./view"
import {Button} from "antd"

export module EditorViews {
    type BindingProps<T, Conf extends FC.EndpointConfig<T>> = {
        binding: XBinding.Binding<T | undefined>
        config: Conf
    }

    export function AvatarEditor(props: BindingProps<string, FC.FileConfig>) {
        const ref = useRef<HTMLInputElement>(null)
        const [showUpload, setShowUpload] = useState(false)
        const [fileBlob, setFileBlob] = useState<null | Blob>(null)
        const clients = useDBClients()

        return <>
            <PreviewViews.AsyncAvatar
                filename={props.binding.value}
                avatarProps={{onClick}}
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
            />
        </>

        function onClick() {
            if(ref.current) {
                ref.current.click()
            }
        }

        async function onComplete(blob: Blob) {
            if(blob === fileBlob) return;
            const newName = `${crypto.randomUUID()}.webp`
            await clients.query.files.write(newName, blob)
            props.binding.update(newName)
            setFileBlob(null)
        }
    }

    export function ImageListEditor(props: BindingProps<string[], FieldConfig.FileListConfig>) {
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
                    return <div key={img.value} style={{maxWidth: "100px", maxHeight: "100px"}}>
                        <PreviewViews.AsyncImage fileName={img.value}>
                            <IconButton icon={<Icons.Delete/>} onClick={() => img.remove()} style={{position: "absolute", top: 0, right: 0}}/>
                        </PreviewViews.AsyncImage>
                    </div>
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