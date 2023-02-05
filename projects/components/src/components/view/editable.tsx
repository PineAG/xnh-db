import {Avatar, Image as AntImage} from "antd"
import { FieldConfig as FC, FieldConfig } from "@xnh-db/protocol"
import { useDBClients, XBinding } from "../sync"
import { AsyncAvatar, AsyncImage, ImageEditDialog, useObjectURL } from "./image"
import { useRef, useState } from "react"
import { Dialog, IconButton, Icons } from "@pltk/components"
import { useEffect } from "react"

type X = FC.ConfigFromDeclaration<string>

export module EditorViews {
    type BindingProps<T, Conf extends FC.EndpointConfig<T>> = {
        binding: XBinding.Binding<T | undefined>
        config: Conf
    }

    export function AvatarEditor(props: BindingProps<string, FC.FileConfig>) {
        const ref = useRef<HTMLInputElement>(null)
        const [fileBlob, setFileBlob] = useState<null | Blob>(null)
        const clients = useDBClients()

        return <>
            <AsyncAvatar
                filename={props.binding.value}
                avatarProps={{onClick}}
            />
            <input ref={ref} type="file" style={{display: "none"}}
                onChange={evt => onFilesChanged(evt.target.files)}
                accept="image/*"
            ></input>
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

        async function onFilesChanged(files: FileList) {
            if(files.length === 0) {
                return
            }
            const file = files[0]
            const blob = await getBlobFromFile(file)
            setFileBlob(blob)
        }

        async function onComplete(blob: Blob) {
            if(blob === fileBlob) return;
            const newName = `${crypto.randomUUID()}.webp`
            await clients.query.files.write(newName, blob)
            props.binding.update(newName)
            setFileBlob(null)
        }
    }

    async function getBlobFromFile(file: File): Promise<Blob> {
        const reader = file.stream().getReader()
        const parts: Uint8Array[] = []
        let part = await reader.read()
        while(!part.done) {
            if(part.value) {
                parts.push(part.value)
            }
            part = await reader.read()
        }
        if(part.value) {
            parts.push(part.value)
        }
        const blob = new Blob(parts)
        return blob
    } 

    export function ImageListEditor(props: BindingProps<string[], FieldConfig.FileListConfig>) {
        const clients = useDBClients()
        const valueBinding = XBinding.defaultValue(props.binding, () => [])
        const imageBindings = XBinding.fromArray(valueBinding)
        const [fileBlob, setFileBlob] = useState<null | Blob>(null)
        const [uploadFile, uploadPlaceholder] = useUploadFile({
            accept: "image/*",
            multiple: false,
            onUpload
        })
        
        return <>
            <div style={{display: "grid", gridTemplateColumns: "repeat(3, 100px)"}}>
                {imageBindings.map(img => {
                    return <div key={img.value} style={{maxWidth: "100px", maxHeight: "100px"}}>
                        <AsyncImage fileName={img.value}>
                            <IconButton icon={<Icons.Delete/>} onClick={() => img.remove()} style={{position: "absolute", top: 0, right: 0}}/>
                        </AsyncImage>
                    </div>
                })}
                <div style={{placeItems: "center", display: "grid", width: "100px", height: "100px"}} onClick={uploadFile}>
                    <Icons.Add/>
                </div>
            </div>
            {uploadPlaceholder}
            <ImageEditDialog
                data={fileBlob}
                onComplete={onComplete}
            />
        </>

        async function onUpload(files: FileList) {
            if(files.length === 0) return;
            const file = files[0]
            const blob = await getBlobFromFile(file)
            setFileBlob(blob)
        }

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

    interface UseUploadFileProps {
        accept?: string
        multiple?: boolean
        onUpload: (files: FileList) => void
    }
    export function useUploadFile(props: UseUploadFileProps): [() => void, JSX.Element] {
        const ref = useRef<HTMLInputElement>(null)
        const ele = <input ref={ref} type="file" style={{display: "none"}} accept={props.accept} multiple={props.multiple} onChange={evt => props.onUpload(evt.target.files)}/>
        return [onUpload, ele]

        function onUpload() {
            if(ref.current) {
                ref.current.click()
            }
        }
    }
}