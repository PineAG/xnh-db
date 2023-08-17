import * as Chakra from "@chakra-ui/react"
import * as ChakraIcons from "@chakra-ui/icons"
import { CSSProperties, createContext, useContext, useEffect, useState } from "react"
import {DndProvider, useDrag, useDrop, DragPreviewImage} from "react-dnd"
import {HTML5Backend} from "react-dnd-html5-backend"
import { FileComponents } from "./files"
import { ImageViewerComponents } from "./images"
import { Observer, useLocalObservable } from "mobx-react-lite"
import { IObservableValue, observable } from "mobx"

export module DnDListComponents {

    export module ImageList {

        interface DataItem {
            name: string
            data: Uint8Array
        }

        interface DataItemSource {
            name: string
            load: () => Promise<Uint8Array>
        }

        export interface Props {
            fileList: DataItemSource[]
            onComplete: (idList: DataItem[]) => void
        }

        interface UseImageListDialogHandle {
            open: () => void
            placeholder: React.ReactNode
        }

        export function useImageListDialog(props: Props): UseImageListDialogHandle {
            const [opened, setOpened] = useState(false)
            const store = FileComponents.useFileList()
            useEffect(() => {
                store.clear()
                if(opened) {
                    store.loadAll(props.fileList)
                }
                return () => store.clear()
            }, [opened, props.fileList.map(it => it.name).join("/")])

            
            const uploader = ImageViewerComponents.useUploadImageDialog({
                onUpload: (data) => {
                    const id = crypto.randomUUID()
                    store.push(`${id}.webp`, data)
                }
            })

            const placeholder = <>
            {uploader.placeholder}
            <Chakra.Modal isOpen={opened} onClose={close} closeOnEsc={false} closeOnOverlayClick={false} size="6xl" scrollBehavior="inside">
                <Chakra.ModalOverlay />
                <Chakra.ModalContent>
                    <Chakra.ModalHeader>
                        编辑图片列表
                    </Chakra.ModalHeader>
                    <Chakra.ModalBody>
                        <DndProvider backend={HTML5Backend}>
                            <ListStoreContext.Provider value={store}>
                                <PropsContext.Provider value={props}>
                                    <ListBody/>
                                </PropsContext.Provider>
                            </ListStoreContext.Provider>
                        </DndProvider>
                    </Chakra.ModalBody>
                    <Chakra.ModalFooter>
                        <Chakra.ButtonGroup>
                            <Chakra.Button colorScheme="pink" onClick={uploader.open} leftIcon={<ChakraIcons.AddIcon/>}>
                                添加
                            </Chakra.Button>
                            <Chakra.Button variant="ghost" onClick={close}>取消</Chakra.Button>
                            <Chakra.Button onClick={save}>保存</Chakra.Button>
                        </Chakra.ButtonGroup>
                    </Chakra.ModalFooter>
                </Chakra.ModalContent>
            </Chakra.Modal>
            </>

            return {
                placeholder,
                open
            }

            function open() {
                setOpened(true)
                store.clear()
            }

            function close() {
                setOpened(false)
                store.clear()
            }

            function save() {
                const results: DataItem[] = []
                for(const [name, data] of store.allData()) {
                    results.push({name, data})
                }
                props.onComplete(results)
                store.clear()
                setOpened(false)
            }
        }

        function ListBody() {
            const store = useNullableContext(ListStoreContext)
            const props = useNullableContext(PropsContext)

            const columns = 5

            return <Observer>
                {() => {
                    const children: React.ReactNode[] = []

                    const rows = Math.ceil(store.files.length / columns)
                    for(let r=0; r<rows; r++) {
                        const cols = r === rows-1 ? store.files.length - r * columns : columns
                        children.push(<DroppableArea index={r*columns} key={`pad_start_${r}`}/>)
                        for(let c=0; c<cols; c++) {
                            const idx = r*columns+c
                            const name = store.files[idx]
                            children.push(<ListImageBox index={idx} name={name} key={`img_${r}_${c}`}/>)
                            children.push(<DroppableArea index={idx+1} key={`pad_${r}_${c}`}/>)
                        }
                    }

                    return <div style={{display: "grid", gridTemplateColumns: `25px repeat(${columns}, 1fr 25px)`, justifyContent: "space-around"}}>
                        {...children}
                    </div>
                }}
            </Observer>
        }

        function ListImageBox(props: {name: string, index: number}) {
            const store = useNullableContext(ListStoreContext)
            const globalProps = useNullableContext(PropsContext)
            const [{isDragging}, drag, preview] = useDrag({
                canDrag: true,
                type: DnDType,
                item: {index: props.index},
                collect: (monitor) => ({
                    isDragging: !!monitor.isDragging()
                })
            })

            return <Observer>
                {() => {
                    const url = store.url(props.name)
                    let previewElement: React.ReactNode = null
                    if(url !== null) {
                        previewElement = <DragPreviewImage connect={preview} src={url}/>
                    }

                    return <> 
                    {previewElement}
                    <ImageViewerComponents.ImageBox src={url} isPending={false} width="150px">
                        <div
                            ref={drag}
                            style={{width: "100%", height: "100%", position: "absolute", top: 0, left: 0}}
                        />
                        <CloseButton name={props.name}/>
                    </ImageViewerComponents.ImageBox>
                    </>
                }}
            </Observer>
        }

        function CloseButton(props: {name: string}) {
            const store = useNullableContext(ListStoreContext)
            return <Chakra.CloseButton style={{position: "absolute", top: "10px", right: "10px"}} onClick={() => store.delete(props.name)}/>
        }

        function DroppableArea(props: {index: number}) {
            const store = useNullableContext(ListStoreContext)
            const globalProps = useNullableContext(PropsContext)
            const [{ isMoving, droppingHere }, drop] = useDrop({
                canDrop: () => true,
                accept: DnDType,
                collect: (monitor) => {
                    return {
                        isMoving: !!monitor.canDrop(),
                        droppingHere: !!monitor.isOver(), 
                    }
                },
                drop: (item: any, monitor) => {
                    let index = item["index"]
                    if(typeof index === "number") {
                        insertIntoList(store, index, props.index)
                    }
                },
            })

            const style: CSSProperties = {height: "100%"}
            style.backgroundColor = isMoving ? "pink" : "transparent"
            
            return <Observer>{() => {
                return <div
                    ref={drop}
                    style={style}
                />
            }}</Observer>
        }

        const PropsContext = createContext<Props | null>(null)
        const DnDType = "list-image"

        function insertIntoList(store: FileComponents.IFileListStore, fromIndex: number, toIndex: number) {
            const keys = store.files
            const [value] = keys.splice(fromIndex, 1)
            if(toIndex > fromIndex) {
                toIndex --
            }
            if(value !== undefined) {
                keys.splice(toIndex, 0, value)
                store.reorder(keys)
            }
        }
    }

    const ListStoreContext = createContext<FileComponents.IFileListStore | null>(null)
}

function useNullableContext<T extends {}>(context: React.Context<T | null>): T {
    const value = useContext(context)
    if(value == null) {
        throw new Error("Not in provider")
    }
    return value
}