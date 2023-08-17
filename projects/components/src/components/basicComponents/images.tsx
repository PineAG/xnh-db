import {CSSProperties, useEffect, useRef} from "react"
import {makeAutoObservable, observable, action, computed} from "mobx"
import * as Chakra from "@chakra-ui/react"
import * as ChakraIcon from "@chakra-ui/icons"
import { ElementaryComponents } from "./elementary"
import { Observer, useLocalObservable } from "mobx-react-lite"
import { FileComponents, FileUtils } from "./files"
import ReactCrop from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css";

export module ImageViewerComponents {
    interface ImageBoxProps {
        src: string | null
        isPending: boolean
        enablePreview?: boolean
        width?: CSSProperties["width"]
        children?: React.ReactNode
    }

    export function ImageBox(props: ImageBoxProps) {
        let internal: React.ReactNode

        const previewImage = usePreviewImage(props.src)

        if(props.isPending) {
            internal = <ElementaryComponents.Loading/>
        } else if(props.src) {
            internal = <Chakra.Image src={props.src} onClick={onClick}/>
        } else {
            internal = <ChakraIcon.WarningTwoIcon/>
        }

        return <div style={{width: props.width ?? "128px", position: "relative", aspectRatio: "1 / 1"}}>
            <div style={{position: "absolute", width: "100%", height: "100%", display: "grid", placeItems: "center", top: 0, left: 0, overflow: "hidden"}}>
                {internal}
            </div>
            {props.children}
        </div>

        function onClick() {
            if(!props.enablePreview || !props.src) {
                return
            }
            previewImage()            
        }
    }

    export function usePreviewImage(src: string | null): () => void {
        return () => {
            if(src) {
                window.open(src, "_blank")
            }
        }
    }

    interface UploadImageProps {
        onUpload: (data: Uint8Array) => void | Promise<void>
    }
    
    interface UploadImageHandle {
        open(): void
        close(): void,
        placeholder: React.ReactNode
    }

    export function useUploadImageDialog(props: UploadImageProps): UploadImageHandle {
        const store = useLocalObservable(() => new UploadImageStore())
        useEffect(() => store.clear(), [])

        let internal: React.ReactNode = <Observer>{() => {
            if(store.data) {
                return <ImageCropper
                    src={store.data.url}
                    crop={store.crop}
                    onChange={(x, y, w, h) => store.setCrop(x, y, w, h)}
                />
            } else {
                return <FileComponents.FileUpload
                    mime="image/*"
                    onUpload={onUpload}>
                    <div style={{display: "grid", placeItems: "center", width: "100%", height: "60px", backgroundColor: "lightgray"}}>
                        <p>点击上传或拖拽图片到此处</p>
                    </div>
                </FileComponents.FileUpload>
            }
        }}</Observer>

        const placeholder = <Observer>
            {() => (
                <Chakra.Modal isOpen={store.showDialog} onClose={close}>
                    <Chakra.ModalOverlay/>
                    <Chakra.ModalContent>
                        <Chakra.ModalHeader>
                            上传图片
                        </Chakra.ModalHeader>
                        
                        <Chakra.ModalBody>
                            {internal}
                        </Chakra.ModalBody>
                        
                        <Chakra.ModalFooter>
                            <Chakra.ButtonGroup>
                                <Chakra.Button variant="outline" onClick={close}>
                                    取消
                                </Chakra.Button>
                                <Chakra.Button variant="solid" disabled={!store.data} onClick={onSubmit}>
                                    确定
                                </Chakra.Button>
                            </Chakra.ButtonGroup>
                        </Chakra.ModalFooter>
                    </Chakra.ModalContent>
                </Chakra.Modal>
            )}
        </Observer>

        return {open, close, placeholder}

        function open() {
            store.setShow(true)
        }

        function close() {
            store.setShow(false)
        }

        async function onSubmit() {
            if(store.data) {
                const data = await ImageUtils.Convert.convert(store.data.data, ImageUtils.Convert.cropAndLimitSize(store.crop))
                await props.onUpload(data)
                store.clear()
                store.setShow(false)
            }
        }

        async function onUpload(file: File) {
            const data = await FileUtils.readFile(file)
            store.onUpload(data)
        }
    }

    class UploadImageStore {
        @observable showDialog: boolean = false
        @observable data: {data: Uint8Array, url: string} | null = null
        @observable crop: {x: number, y: number, width: number, height: number} = {x: 0, y: 0, width: 1, height: 1}

        constructor() {
            makeAutoObservable(this)
        }

        @action setShow(show: boolean) {
            this.clear()
            this.showDialog = show
        }

        @action onUpload(data: Uint8Array) {
            this.clear()
            this.data = {data, url: URL.createObjectURL(new Blob([data]))}
        }

        @action setCrop(x: number, y: number, widthPercentage: number, heightPercentage: number) {
            this.crop = {
                x, y,
                width: widthPercentage,
                height: heightPercentage
            }
        }

        @action clear() {
            if(this.data) {
                URL.revokeObjectURL(this.data.url)
                this.data = null
            }
            this.crop = {x: 0, y: 0, width: 1, height: 1}
        }
    }

    interface ImageCropperProps {
        src: string
        crop: {x: number, y: number, width: number, height: number}
        onChange: (x: number, y: number, width: number, height: number) => void
    }
    export function ImageCropper(props: ImageCropperProps) {
        const ref = useRef<HTMLImageElement>(null)
        return <ReactCrop 
            crop={{unit: "%", x: props.crop.x * 100, y: props.crop.y * 100, width: props.crop.width * 100, height: props.crop.height * 100}}
            onChange={(_pxCrop, crop) => {
                if(!ref.current) {
                    return;
                }
                props.onChange(crop.x/100, crop.y/100, crop.width/100, crop.height/100)
            }}
            >
            <img ref={ref} src={props.src}/>
        </ReactCrop>
    }

    interface DataListItemSource {
        name: string
        load(): Promise<Uint8Array>
    }

    export interface ImageListProps {
        fileList: DataListItemSource[]
        style?: CSSProperties
    }

    export function ImageList(props: ImageListProps) {
        const store = FileComponents.useFileList()
        useEffect(() => {
            store.clear()
            store.loadAll(props.fileList)
            return () => store.clear()
        }, [props.fileList.map(it => it.name).join("/")])

        return <Observer>
            {() => (
                <Chakra.Grid gridTemplateColumns="repeat(5, 1fr)">
                    {store.files.map(fn => (
                        <Chakra.GridItem key={fn}>
                            <ImageBox src={store.url(fn)} isPending={!store.url(fn)} enablePreview/>
                        </Chakra.GridItem>
                    ))}
                </Chakra.Grid>
            )}
        </Observer>
    }

}

export module ImageUtils {
    
    export module Convert {
        export interface Rect {x: number, y: number, width: number, height: number}
        export interface Size {width: number, height: number}

        export interface PaintContext {
            image: ImageBitmap
            canvas: CanvasRenderingContext2D
        }

        export interface IConvertor {
            outputSize(size: Size): Size
            paint(ctx: PaintContext): void
        }

        export async function convert(data: Uint8Array, convertor: IConvertor): Promise<Uint8Array> {
            const bitmap = await createImageBitmap(new Blob([data]))
            const canvas = document.createElement("canvas")

            try {
                const targetSize = convertor.outputSize({
                    width: bitmap.width,
                    height: bitmap.height
                })
                canvas.width = targetSize.width
                canvas.height = targetSize.height

                const ctx = canvas.getContext("2d")
                if(!ctx) {
                    throw new Error("Could not setup canvas.")
                }
                convertor.paint({image: bitmap, canvas: ctx})
            } finally {
                bitmap.close()
            }
            
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if(b) {
                        resolve(b)
                    } else {
                        reject("Failed to export canvas.")
                    }
                }, "image/webp")
            })
    
            return new Uint8Array(await blob.arrayBuffer())
        }

        type ResizeOptions = {srcRect: Rect, dstRect: Rect, dstSize: Size}
        type ResizeConvertor = (size: Size) => ResizeOptions

        export class CropAndResizeConvertor implements IConvertor {
            constructor(private mapper: ResizeConvertor) {}

            outputSize(size: Size): Size {
                return this.mapper(size).dstSize
            }
            
            paint(ctx: PaintContext): void {
                const {srcRect, dstRect} = this.mapper({width: ctx.image.width, height: ctx.image.height})
                Utils.cropAndPaste(ctx, srcRect, dstRect)
            }
        }

        export function cropAndLimitSize(cropByPercentage: Rect): CropAndResizeConvertor {
            const MAX_IMAGE_WIDTH = 1000
            return new CropAndResizeConvertor((size: Size) => {
                const srcRect: Rect = {
                    x: size.width * cropByPercentage.x,
                    y: size.width * cropByPercentage.y,
                    width: size.width * cropByPercentage.width,
                    height: size.height * cropByPercentage.height,
                }

                const cropDstWidth = size.width * cropByPercentage.width
                const cropDstHeight = size.height * cropByPercentage.height

                const diffScale = MAX_IMAGE_WIDTH * 2 / (cropDstWidth + cropDstHeight)
                const scale = Math.min(1, diffScale)

                const dstSize: Size = {
                    width: cropDstWidth * scale,
                    height: cropDstHeight * scale
                }

                const dstRect: Rect = {
                    x: 0,
                    y: 0,
                    ...dstSize
                }

                return {srcRect, dstRect, dstSize}
            })
        }

        export module Utils {
            export function cropAndPaste(ctx: PaintContext, source: Rect, destination: Rect) {
                ctx.canvas.drawImage(
                    ctx.image,
                    source.x, source.y, source.width, source.height,
                    destination.x, destination.y, destination.width, destination.height)
            }
        }
    }
}
