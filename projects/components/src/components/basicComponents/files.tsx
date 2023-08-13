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

    export function useFileList() {
        const store = useLocalObservable(() => new FileListStore())
        useEffect(() => store.clear(), [])
        return store
    }


    class FileListStore {
        @observable private keys: string[] = observable.array()
        @observable private payloads: Map<string, DataItem> = observable.map()

        constructor() {
            makeAutoObservable(this)
        }

        @computed get files() {
            return toJS(this.keys)
        }

        @computed url(name: string) {
            const data = this.payloads.get(name)
            if(!data) {
                throw new Error(`Not found: ${name}`)
            }
            return data.url
        }

        @computed allData(): Record<string, Uint8Array> {
            const result: Record<string, Uint8Array> = {}
            for(const [key, data] of this.payloads.entries()) {
                result[key] = data.data
            }
            return result
        }



        @action push(name: string, data: Uint8Array) {
            if(this.payloads.has(name)) {
                throw new Error(`File has already exists: ${name}`)
            }

            this.keys.push(name)
            const url = URL.createObjectURL(new Blob([data]))
            this.payloads.set(name, {data, url})
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
            if(data) {
                this.payloads.delete(name)
                URL.revokeObjectURL(data.url)
            }
        }

        @action clear() {
            for(const data of this.payloads.values()) {
                URL.revokeObjectURL(data.url)
            }
            this.payloads.clear()
            this.keys.splice(0, this.keys.length)
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

