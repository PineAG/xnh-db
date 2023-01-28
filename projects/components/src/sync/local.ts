import { OctokitResults } from "./client"

export module OctokitCertificationStore {
    const certKey = "xnh-db.github.cert"
    const commitKey = "xnh-db.github.lastCommit"

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

    export function clear() {
        localStorage.removeItem(certKey)
        localStorage.removeItem(commitKey)
    }
}
