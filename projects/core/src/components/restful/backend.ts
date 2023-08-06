import { DBFileBackend } from "@xnh-db/common";

export module RestfulFileBackend {
    export interface Options {
        baseURI: string
    }
    
    export class ReadonlyBackend implements DBFileBackend.IFileReadonlyBackend {
        constructor(private options: Options) {}

        reader(): DBFileBackend.IFileReader {
            return new Reader(this.options)
        }
    }
    
    export class FileBackend implements DBFileBackend.IFileBackend {
        constructor(private options: Options) {}

        reader(): DBFileBackend.IFileReader {
            return new Reader(this.options)
        }
        
        writer(): DBFileBackend.IFileWriter {
            return new Writer(this.options)
        }
    }

    class Reader implements DBFileBackend.IFileReader {
        constructor(private options: Options) {}

        read(name: string): Promise<Uint8Array | null> {
            return this.on(`${this.options.baseURI}/${name}`).get()
        }

        private on(url: string): HttpClient {
            return new HttpClient(url)
        }
    }

    class Writer implements DBFileBackend.IFileWriter {
        private actions: (() => Promise<void>)[] = []

        constructor(private options: Options) {}

        write(name: string, value: Uint8Array): void {
            this.actions.push(() => this.writeInternal(name, value))
        }

        delete(name: string): void {
            this.actions.push(() => this.deleteInternal(name))
        }

        private writeInternal(name: string, value: Uint8Array): Promise<void> {
            return this.on(`${this.options.baseURI}/${name}`).put(value)
        }

        private deleteInternal(name: string): Promise<void> {
            return this.on(`${this.options.baseURI}/${name}`).delete() 
        }

        private on(url: string): HttpClient {
            return new HttpClient(url)
        }

        async commit(): Promise<void> {
            let latest = Promise.resolve()
            for(const func of this.actions) {
                latest = latest.then(func)
            }
            await latest
        }
    }

    class HttpClient {
        constructor(private url: string) {}

        async get(): Promise<Uint8Array | null> {
            const res = await fetch(this.url, {
                method: "GET"
            })
            if(res.status === 404) {
                return null
            } else if (res.status >= 400) {
                this.invalidStatusError(res.status)
            } else {
                const buffer = await res.arrayBuffer()
                return new Uint8Array(buffer)
            }
        }

        async post(body: Uint8Array): Promise<void> {
            fetch(this.url, {
                method: "POST",
                body: new Blob([body])
            })
        }

        async put(body: Uint8Array): Promise<void> {
            fetch(this.url, {
                method: "PUT",
                body: new Blob([body])
            })
        }

        async delete(): Promise<void> {
            const res = await fetch(this.url, {
                method: "DELETE"
            })
            if(res.status >= 400) {
                this.invalidStatusError(res.status)
            }
        }

        private invalidStatusError(status: number): never {
            throw new Error(`Unexpected HTTP status code: ${status}`)
        }
    }
}