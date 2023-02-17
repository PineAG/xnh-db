import { DbContexts } from "../context"
import { GlobalSyncComponents } from "../sync"

export function useRelationUtils(collectionName: string, colToRelName: string) {
    const globalProps = DbContexts.useProps()
    const clients = GlobalSyncComponents.useQueryClients()
    const {relation, selfKey, targetKey} = globalProps.props.collectionsToRelations[collectionName][colToRelName]
    const targetCollection = globalProps.props.relations[relation].collections[targetKey]
    return {
        client: clients.relations[relation],
        relationName: relation,
        selfKey, targetKey,
        targetCollection
    }
}