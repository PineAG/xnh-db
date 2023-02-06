import {useRef} from "react"
import { UserOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import { useDBClients, XBinding } from "../sync";
import ReactCrop, { Crop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, Loading } from "@pltk/components";
import { AvatarSize } from "antd/es/avatar/SizeContext";
import { Modal } from "antd";

export function useObjectURL(blob: Blob | null): string | null {
    const [url, setUrl] = useState<string | null>(null)
    useEffect(() => {
        let url: string | undefined
        if(blob !== null) {
            url = URL.createObjectURL(blob)
            setUrl(url)
        }
        return () => {
            if(url) {
                URL.revokeObjectURL(url)
            }
        }
    }, [blob])
    return url
}

export function useObjectURLList(blob: Blob[]): string[] {
    const [url, setUrl] = useState<string[]>([])
    useEffect(() => {
        const url: string[] = blob.map(b => URL.createObjectURL(b))
        setUrl(url)
        return () => {
            for(const u of url) {
                URL.revokeObjectURL(u)
            }
        }
    }, [blob])
    return url
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

export async function getBlobFromFile(file: File): Promise<Blob> {
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

export interface ImageUploadDialogProps {
    open: boolean
    onUpload(blob: Blob): void
    onCancel(): void
}
export function ImageUploadDialog(props: ImageUploadDialogProps) {
    const [startUpload, uploadFilePlaceholder] = useUploadFile({
        accept: "image/*",
        multiple: false,
        onUpload: onUploadByFileList
    })
    return <Modal 
        title="上传图片"
        open={props.open}
        onCancel={props.onCancel}
        okButtonProps={{style: {display: "none"}}}
        wrapProps={{
            onPaste: evt => onPaste(evt.clipboardData.items)
        }}
        >
            <div 
                onPaste={evt => onPaste(evt.clipboardData.items)}
                onClick={startUpload}
                onDragOverCapture={evt => {
                    evt.preventDefault()
                }}
                onDrop={evt => {
                    evt.preventDefault()
                    onUploadByFileList(evt.dataTransfer.files)
                }}
                style={{
                    display: "grid",
                    placeItems: "center",
                    width: "300px",
                    height: "200px",
                    backgroundColor: "lightgray"
                }}>
                    <div>点击上传、拖拽或粘贴到此处</div>
            </div>
        {uploadFilePlaceholder}
    </Modal>

    async function onUploadByFileList(files: FileList) {
        if(files.length === 0) {
            return
        }
        const file = files[0]
        const blob = await getBlobFromFile(file)
        props.onUpload(blob)
    }

    async function onPaste(items: DataTransferItemList) {
        const imageItems = Array.from(items).filter(it => it.type.includes("image"))
        if(imageItems.length === 0) {
            return 
        }
        const item = items[0]
        const file = item.getAsFile()
        const blob = await getBlobFromFile(file)
        props.onUpload(blob)
    }
}


export interface ImageEditDialogProps {
    data: Blob | null
    onComplete: (blob: Blob) => void
}

export function ImageEditDialog(props: ImageEditDialogProps) {
    const [crop, setCrop] = useState<Crop>({x: 0, y: 0, width: 100, height: 100, unit: "%"})
    const [displayBlob, setDisplayBlob] = useState<Blob | null>(null)
    const url = useObjectURL(displayBlob)


    useEffect(() => {
        if(props.data) {
            initialize()
        } else {
            setDisplayBlob(null)
        }
    }, [props.data])

    return <Dialog title="上传图片" open={displayBlob !== null && url !== null} onCancel={onCancel} onOk={onOk}>
        <ReactCrop crop={crop} onChange={setCrop}>
            <img src={url}/>
        </ReactCrop>
    </Dialog>

    async function onCancel() {
        props.onComplete(props.data)
    }

    async function onOk() {
        if(!displayBlob || crop.unit === "%") return;
        const out = await openImage(displayBlob, (img, canvas) => {
            const {x, y, width, height} = crop
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext("2d")
            ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
        })
        await props.onComplete(out)
    }

    async function initialize() {
        const blob = props.data
        if(!blob) return;
        setDisplayBlob(null)
        const maxWidth = 500
        const out = await openImage(blob, (img, canvas) => {
            let scale = 1
            if(img.width > maxWidth) {
                scale = maxWidth / img.width
            }
            canvas.width = Math.floor(img.width * scale)
            canvas.height = Math.floor(img.height * scale)
            const ctx = canvas.getContext("2d")
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)
            setCrop({x: 0, y: 0, width: canvas.width, height: canvas.height, unit: "px"})
        })
        setDisplayBlob(out)
    }

    async function openImage(blob: Blob, cb: (img: HTMLImageElement, canvas: HTMLCanvasElement) => Promise<void> | void): Promise<Blob> {
        const img = new Image()
        let url = URL.createObjectURL(blob)
        const canvas = document.createElement("canvas")
        await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = (evt, msg) => reject(msg)
            img.src = url
        })
        await cb(img, canvas)
        const out = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(result => {
                if(result) {
                    resolve(result)
                } else {
                    reject("Failed to export canvas")
                }
            }, "image/webp")
        })
        URL.revokeObjectURL(url)
        return out
    }
}
