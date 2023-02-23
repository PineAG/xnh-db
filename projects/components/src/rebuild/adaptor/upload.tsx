
import ReactCrop, {Crop} from "react-image-crop";
import {useRef, useState, useEffect, ClipboardEvent} from "react"
import {Modal} from "antd"
import { AdaptorsConfig } from "./config";
import { GlobalSyncComponents } from "../components/sync";
import "react-image-crop/dist/ReactCrop.css";

export module AntdUpload {
    interface UseUploadFileProps {
        accept?: string
        multiple?: boolean
        onUpload: (files: FileList) => void
    }
    
    export function useUploadFile(props: UseUploadFileProps): [() => void, JSX.Element] {
        const ref = useRef<HTMLInputElement>(null)
        const ele = <input ref={ref} type="file" style={{display: "none"}} accept={props.accept} multiple={props.multiple} onChange={evt => {
            if(evt.target.files) {
                props.onUpload(evt.target.files)
            }
        }}/>
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
        onUpload(fileName: string): void
        onCancel(): void
    }
    type ImageUploadDialogState = {state: "empty"} | {state: "uploaded", data: Blob, displayURL: string, scale: number}
    export function ImageUploadDialog(props: ImageUploadDialogProps) {
        const [state, setState] = useState<ImageUploadDialogState>({state: "empty"})
        const [crop, setCrop] = useState<Crop>({x: 0, y: 0, width: 0, height: 0, unit: "px"})
        const clients = GlobalSyncComponents.useQueryClients()

        const [imageUploader, onPaste] = useImageUpload(onUpload)

        useEffect(() => {
            return () => {
                if(state.state === "uploaded") {
                    URL.revokeObjectURL(state.displayURL)
                }
            }
        }, [state.state])

        let content: JSX.Element
        if(state.state === "empty") {
            content = imageUploader
        } else {
            content = <ReactCrop crop={crop} onChange={setCrop}>
                <img src={state.displayURL}/>
            </ReactCrop>
        }
        
        return <Modal
            title="上传图片"
            open={props.open}
            onCancel={() => {
                props.onCancel()
                setState({state: "empty"})
            }}
            onOk={finalize}
            okButtonProps={{disabled: state.state === "empty"}}
            wrapProps={{
                onPaste: (evt: ClipboardEvent<HTMLElement>) => {
                    onPaste(evt)
                }
            }}
            >
                {content}
        </Modal>

        async function onUpload(file: File) {
            const blob = await getBlobFromFile(file)
            const [out, scale] = await processImageBlob(blob, (img, canvas) => {
                let scale = 1
                if(img.width > AdaptorsConfig.maxImageWidth) {
                    scale = AdaptorsConfig.maxImageWidth / img.width
                }
                canvas.width = Math.floor(img.width * scale)
                canvas.height = Math.floor(img.height * scale)
                const ctx = canvas.getContext("2d")
                if(!ctx) {
                    throw new Error("corrupted ctx")
                }
                ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)
                setCrop({x: 0, y: 0, width: canvas.width, height: canvas.height, unit: "px"})
                return scale
            })
            const displayURL = URL.createObjectURL(out)
            setState({state: "uploaded", data: blob, displayURL, scale})
        }

        async function finalize() {
            if(state.state !== "uploaded") {
                return
            }
            if(crop.unit !== "px") return;
            const prevScale = state.scale
            const [blob] = await processImageBlob(state.data, (img, canvas) => {
                let scale = 1
                const x = crop.x / prevScale
                const y = crop.y / prevScale
                const width = crop.width / prevScale
                const height = crop.height / prevScale
                if(width > AdaptorsConfig.maxImageWidth) {
                    scale = AdaptorsConfig.maxImageWidth / width
                }
                canvas.width = Math.floor(width * scale)
                canvas.height = Math.floor(height * scale)
                const ctx = canvas.getContext("2d")
                if(!ctx) {
                    throw new Error("corrupted ctx")
                }
                ctx.drawImage(img, x, y, width, height, 0, 0, canvas.width, canvas.height)
            })
            const newId = crypto.randomUUID()
            await clients.files.write(newId, blob)
            await clients.files.markDirtyFile(newId, true)
            props.onUpload(newId)
            setState({state: "empty"})
        }
        
    }
    
    export function useImageUpload(onChange: (file: File) => void): [JSX.Element, React.ClipboardEventHandler<HTMLElement>] {
        const [startUpload, uploadFilePlaceholder] = useUploadFile({
            accept: "image/*",
            multiple: false,
            onUpload: onUploadByFileList
        })
        const component = <div 
            onPaste={wrappedOnPaste}
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
            {uploadFilePlaceholder}
        </div>
        return [component, wrappedOnPaste] 

        function wrappedOnPaste(evt: React.ClipboardEvent<HTMLDivElement>) {
            return onPaste(evt.clipboardData.items)
        }

        async function onPaste(items: DataTransferItemList) {
            const imageItems = Array.from(items).filter(it => it.type.includes("image"))
            if(imageItems.length === 0) {
                return 
            }
            const item = items[0]
            const file = item.getAsFile()
            if(file) {
                onChange(file)
            }
        }

        async function onUploadByFileList(files: FileList) {
            if(files.length === 0) {
                return
            }
            const file = files[0]
            onChange(file)
        }
    }
    
    async function processImageBlob<R>(blob: Blob, cb: (img: HTMLImageElement, canvas: HTMLCanvasElement) => R | Promise<R>): Promise<[Blob, R]> {
        const img = new Image()
        let url = URL.createObjectURL(blob)
        const canvas = document.createElement("canvas")
        await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = (evt, msg) => reject(msg)
            img.src = url
        })
        const result = await cb(img, canvas)
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
        return [out, result]
    }
}