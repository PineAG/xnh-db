import {Avatar} from "antd"
import { FieldConfig as FC } from "@xnh-db/protocol"
import { useDBClients, XBinding } from "../sync"
import { AsyncAvatar, ImageEditDialog, useObjectURL } from "./image"
import { useRef, useState } from "react"
import { Dialog } from "@pltk/components"
import { useEffect } from "react"

type X = FC.ConfigFromDeclaration<string>

export module EditorViews {
    type BindingProps<T, Conf extends FC.EndpointConfig<T>> = {
        title: string
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
}