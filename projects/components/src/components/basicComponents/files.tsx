import { useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import * as B64 from "js-base64"
import mobx, { action, computed, makeAutoObservable, observable, toJS } from "mobx"
import { Observer, useLocalObservable } from "mobx-react-lite"

export module FileComponents {
    
    type FileHooks = {
        multiple: true,
        onUpload(files: File[]): void
    } | {
        multiple?: false,
        onUpload(file: File): void
    }

    type FileUploadProps = FileHooks & {
        mime?: string
        children: React.ReactNode
    }

    export function FileUpload(props: FileUploadProps) {
        const {getRootProps, getInputProps} = useDropzone({onDrop: onChange})

        return (
            <div {...getRootProps()}>
              <input {...getInputProps()} multiple={props.multiple} accept={props.mime} />
              {props.children}
            </div>
        )

        function onChange(files: File[]){
            if(files.length === 0) {
                return
            }
            if(props.multiple) {
                props.onUpload(files)
            } else {
                props.onUpload(files[0])
            }

        }
    }

    
    interface FileLoaderProps {
        fileName: string
        loader: (name: string) => Promise<Uint8Array>
        children: (url: string | null, isPending: boolean, errorMessage: string | null) => React.ReactNode
    }

    export function FileLoader(props: FileLoaderProps) {
        const store = useLocalObservable(() => new FileLoaderStore())

        useEffect(() => {
            store.load(props.fileName, props.loader)
            return () => store.clearData()
        }, [props.fileName])

        return <Observer>
            {() => <>
                {props.children(store.data?.url ?? null, store.pending, store.errorMessage)}
            </>}
        </Observer>
    }

    interface DataItem {
        data: Uint8Array
        url: string
    }

    class FileLoaderStore {
        @observable pending: boolean = false
        @observable data: DataItem | null = null
        @observable errorMessage: string | null = null

        constructor() {
            makeAutoObservable(this)
        }

        async load(name: string, loader: (name: string) => Promise<Uint8Array>): Promise<void> {
            this.setPending(true)
            try {
                const data = await loader(name)
                this.setData(data)
                this.setErrorMessage(null)
                this.setPending(false)
            } catch(ex: any) {
                console.error(ex)
                this.setErrorMessage(ex.toString())
                this.setPending(false)
                this.clearData()
            }
        }

        @action setData(data: Uint8Array) {
            if(this.data) {
                this.clearData()
            }

            this.data = {
                data,
                url: URL.createObjectURL(new Blob([data]))
            }
        }

        @action clearData() {
            if(this.data) {
                URL.revokeObjectURL(this.data.url)
                this.data = null
            }
        }

        @action setPending(pending: boolean) {
            this.pending = pending
        }

        @action setErrorMessage(message: string | null) {
            this.errorMessage = message
        }
    }

    export function useFileList(): IFileListStore {
        const store = useLocalObservable(() => new FileListStore())
        useEffect(() => store.clear(), [])
        return store
    }

    export interface IFileListStore extends FileListStore {}

    type DataListItem = {loaded: false} | {loaded: true, data: Uint8Array, url: string}

    interface DataListItemSource {
        name: string
        load(): Promise<Uint8Array>
    }

    class FileListStore {
        @observable pending: boolean = false
        @observable private keys: string[] = observable.array()
        @observable private payloads: Map<string, DataListItem> = observable.map()

        private currentPromise: Promise<void> = Promise.resolve()

        constructor() {
            makeAutoObservable(this)
        }

        @computed get files() {
            return toJS(this.keys)
        }

        @computed url(name: string): string | null {
            const data = this.payloads.get(name)
            if(data?.loaded) {
                return data.url
            }
            return null
        }

        @computed allData(): [string, Uint8Array][] {
            const result: [string, Uint8Array][] = []
            for(const key of this.keys) {
                const item = this.payloads.get(key)
                if(item?.loaded) {
                    result.push([key, item.data])
                }
            }
            return result
        }

        async loadAll(files: DataListItemSource[]) {
            for(const f of files) {
                let data: Uint8Array
                this.setPending(false)
                try {
                    this.setPayload(f.name, {loaded: false})
                    const p = this.currentPromise.then(f.load)
                    data = await p
                    this.push(f.name, data)
                } finally {
                    this.setPending(false)
                }
                this.push(f.name, data)
            }
        }

        @action setPayload(name: string, payload: DataListItem) {
            this.payloads.set(name, payload)
        }

        async load(name: string, loader: (name: string) => Promise<Uint8Array>) {
            this.setPending(false)
            try {
                const data = await loader(name)
                this.push(name, data)
            } finally {
                this.setPending(false)
            }
        }

        @action push(name: string, data: Uint8Array) {
            const current = this.payloads.get(name)
            if(current?.loaded) {
                URL.revokeObjectURL(current.url)
            }
            this.payloads.delete(name)

            const currentIdx = this.keys.indexOf(name)
            if(currentIdx >= 0) {
                this.keys.splice(currentIdx, 1)
            }

            this.keys.push(name)
            const url = URL.createObjectURL(new Blob([data]))
            this.payloads.set(name, {loaded: true, data, url})
        }

        @action reorder(newList: string[]) {
            if(newList.length !== this.keys.length) {
                throw new Error("Invalid new file list.")
            }
            const names = new Set(newList)
            for(const n of this.payloads.keys()) {
                if(!names.has(n)) {
                    throw new Error(`Missing file name: ${n}`)
                }
            }
            this.keys = observable.array(newList)
        }

        @action delete(name: string) {
            const idx = this.keys.indexOf(name)
            if(idx >= 0) {
                this.keys.splice(idx, 1)
            }
            const data = this.payloads.get(name)
            if(data?.loaded) {
                this.payloads.delete(name)
                URL.revokeObjectURL(data.url)
            }
        }

        @action clear() {
            for(const data of this.payloads.values()) {
                if(data?.loaded) {
                    URL.revokeObjectURL(data.url)
                }
            }
            this.payloads.clear()
            this.keys.splice(0, this.keys.length)
        }

        @action setPending(pending: boolean) {
            this.pending = pending
        }
    }
}

export module FileUtils {
    export async function readFile(file: File): Promise<Uint8Array> {
        const reader = new FileReader()

        const promise = new Promise<ArrayBuffer>((resolve, reject) => {
            reader.onabort = ev => reject(ev)
            reader.onerror = ev => reject(ev)
            reader.onload = () => {
                const buffer = reader.result as ArrayBuffer
                resolve(buffer)
            }
        })

        reader.readAsArrayBuffer(file)

        const buffer = await promise
        return new Uint8Array(buffer)
    }

    export async function getHash(data: Uint8Array): Promise<string> {
        const hash = await crypto.subtle.digest("SHA-256", data)
        return B64.fromUint8Array(new Uint8Array(hash), true)
    }
}

