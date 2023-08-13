import { useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import * as B64 from "js-base64"
import mobx, { action, makeAutoObservable, observable } from "mobx"
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

