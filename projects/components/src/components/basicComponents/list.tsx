import { createContext, useContext, useEffect } from "react"
import {DndProvider, useDrag, useDrop, DragPreviewImage} from "react-dnd"
import {HTML5Backend} from "react-dnd-html5-backend"
import { FileComponents } from "./files"
import { ImageViewerComponents } from "./images"
import { Observer, useLocalObservable } from "mobx-react-lite"
import { IObservableValue, observable } from "mobx"

export module DnDListComponents {

    export module ImageList {
        export interface Props {
            columns: number
            idList: string[]
            load: (id: string) => Promise<Uint8Array>
            onComplete: (idList: string[]) => void
            upload: (id: string, data: Uint8Array) => Promise<void>
        }

        export function ImageList(props: Props) {
            const store = FileComponents.useFileList()
            useEffect(() => {
                store.clear()
                store.loadAll(props.idList, props.load)
                return () => store.clear()
            }, props.idList)

            return <DndProvider backend={HTML5Backend}>
                <ListStoreContext.Provider value={store}>
                    <PropsContext.Provider value={props}>
                            <ListBody/>
                    </PropsContext.Provider>
                </ListStoreContext.Provider>
            </DndProvider>
        }

        function ListBody() {
            const store = useNullableContext(ListStoreContext)
            const props = useNullableContext(PropsContext)
            const uploader = ImageViewerComponents.useUploadImageDialog({
                onUpload: (data) => store.push(crypto.randomUUID(), data)
            })

            return <Observer>
                {() => {
                    const children: React.ReactNode[] = []

                    const rows = Math.ceil(store.files.length / props.columns)
                    for(let r=0; r<rows; r++) {
                        const cols = r === rows-1 ? store.files.length - r * props.columns : props.columns
                        children.push(<DroppableArea index={r*props.columns} key={`pad_start_${r}`}/>)
                        for(let c=0; c<cols; c++) {
                            const idx = r*props.columns+c
                            const name = store.files[idx]
                            children.push(<ListImageBox index={idx} name={name} key={`img_${r}_${c}`}/>)
                            children.push(<DroppableArea index={idx+1} key={`pad_${r}_${c}`}/>)
                        }
                    }

                    return <div style={{display: "grid", gridTemplateColumns: `${droppableAreaWidth} repeat(${props.columns}, 1fr ${droppableAreaWidth})`}}>
                        {...children}
                        <button onClick={() => {
                            console.log("Upload")
                            uploader.open()
                        }}>添加</button>
                        {uploader.placeholder}
                    </div>
                }}
            </Observer>
        }

        function ListImageBox(props: {name: string, index: number}) {
            const store = useNullableContext(ListStoreContext)
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
                    <ImageViewerComponents.ImageBox src={url} isPending={false}>
                        <div
                            ref={drag}
                            style={{width: "100%", height: "100%", position: "absolute", top: 0, left: 0}}
                        />
                    </ImageViewerComponents.ImageBox>
                    </>
                }}
            </Observer>
        }

        function DroppableArea(props: {index: number}) {
            const store = useNullableContext(ListStoreContext)
            const [{ isMoving }, drop] = useDrop({
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

            return <Observer>{() => {
                return <div
                    ref={drop}
                    style={{height: "100%", backgroundColor: isMoving ? "pink" : "transparent"}}
                />
            }}</Observer>
        }

        const PropsContext = createContext<Props | null>(null)
        const DnDType = "list-image"
        const droppableAreaWidth = "50px"

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