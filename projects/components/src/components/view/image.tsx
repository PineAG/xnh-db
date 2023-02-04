import {useRef} from "react"
import { UserOutlined } from "@ant-design/icons";
import { Avatar, AvatarProps } from "antd";
import React, { useEffect, useState } from "react";
import { useDBClients, XBinding } from "../sync";
import ReactCrop, { Crop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, StringField, useLocalDBinding } from "@pltk/components";


export function AsyncAvatar({filename, icon, avatarProps}: {filename: string | undefined, icon?: React.ReactNode, avatarProps?: AvatarProps}) {
    const [url, setUrl] = useState<string | null>(null)
    const clients = useDBClients()

    useEffect(() => {
        let url: string | undefined
        if(filename) {    
            clients.query.files.read(filename).then(blob => {
                url = URL.createObjectURL(blob)
                setUrl(url)
            })
        }
        return () => {
            if(url) {
                URL.revokeObjectURL(url)
                setUrl(null)
            }
        }
    }, [filename])

    if(url === null) {
        return <Avatar
            size="large"
            icon={icon ?? <UserOutlined/>}
            {...avatarProps}
        />
    } else {
        return <Avatar
            size="large"
            src={url}
            {...avatarProps}
        />
    }
}

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
            console.log(crop)
            ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
        })
        console.log("DONE!", out)
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
