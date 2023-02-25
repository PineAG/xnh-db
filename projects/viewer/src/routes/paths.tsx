export module XnhPath {
    export function collectionHome(collectionName: string) {
        return `/collection/${collectionName}`
    }
    export function viewCollection(collectionName: string, itemId: string) {
        return `/collection/${collectionName}/view/${itemId}`
    }
    export function createCollection(collectionName: string, itemId: string) {
        return `/collection/${collectionName}/create/${itemId}`
    }
    export function editCollection(collectionName: string, itemId: string) {
        return `/collection/${collectionName}/edit/${itemId}`
    }
    export function searchCollection(collectionName: string, query: string) {
        return `/collection/${collectionName}/search/${query}`
    }
}