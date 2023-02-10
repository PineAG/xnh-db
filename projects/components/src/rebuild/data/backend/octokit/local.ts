import { OctokitResults } from "./client"

export module OctokitCertificationStore {
    const certKey = "xnh-db.github.cert"
    const commitKey = "xnh-db.github.lastCommit"
    const versionKey = "xnh-db.data.version"

    export interface IGithubCert {
        token: string,
        repo: OctokitResults.Branch
    }

    export module cert {
        export function get(): IGithubCert | null {
            const s = localStorage[certKey]
            return s ? JSON.parse(s) : null
        }

        export function set(cert: IGithubCert) {
            localStorage[certKey] = JSON.stringify(cert)
        }

        export function clear() {
            localStorage.removeItem(certKey)
        }
    }
    
    export module backupCommit {
        export function get(): string | null {
            return localStorage[commitKey] ?? null
        }

        export function set(commit: string) {
            localStorage[commitKey] = commit
        }

        export function clear() {
            localStorage.removeItem(commitKey)
        }
    }

    export module version {
        export function get(): number | null {
            const s = localStorage[versionKey]
            return s ? parseInt(s) : null
        }

        export function set(version: number) {
            localStorage[versionKey] = `${version}`
        }
    }

    export function clear() {
        localStorage.removeItem(certKey)
        localStorage.removeItem(commitKey)
    }
}
