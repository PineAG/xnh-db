import { BackendBase, DBStorage, IndexedDBBackend, OctokitBackend } from "../data"
import { createNullableContext, useNullableContext } from "@pltk/components";
import { DbUiConfiguration } from "../config";

export module DbContexts {
    type DPBase = DbUiConfiguration.DataPropsBase
    interface AppProps<Props extends DPBase> {
        config: Props
        layout: DbUiConfiguration.DisplayProps<Props>
        dbName: string
        children: React.ReactNode
    }
    interface DBConf {
        dbName: string
    }

    const GlobalPropsContext = createNullableContext<DbUiConfiguration.GlobalPropsBase>("AppProvider not initialized")
    const DBConfContext = createNullableContext<DBConf>("AppProvider not initialized")

    export function AppProvider<DProps extends DPBase>(props: AppProps<DProps>) {
        return <GlobalPropsContext.Provider value={{props: props.config, layout: props.layout}}>
            <DBConfContext.Provider value={{dbName: props.dbName}}>
                {props.children}
            </DBConfContext.Provider>
        </GlobalPropsContext.Provider>
    }
    
    export function useProps() {
        return useNullableContext(GlobalPropsContext)
    }

    export function useOnlineClientsBuilder() {
        const dbConf = useNullableContext(DBConfContext)
        const props = useProps()
        return (cert: string, branch: OctokitBackend.OctokitResults.Branch) => DBStorage.createOctokitStorage(props.props, dbConf.dbName, cert, branch)
    }

    export function useOfflineClientsBuilder() {
        const dbConf = useNullableContext(DBConfContext)
        const props = useProps()
        return () => DBStorage.createRestfulStorage(props.props, dbConf.dbName)
    }

    export function useCollectionConfig(collectionName: string) {
        const props = useProps()
        return props.props.collections[collectionName].config
    }

    export function useRelationConfig(relationName: string) {
        const props = useProps()
        return props.props.relations[relationName].payloadConfig
    }

    export function useDestroyLocalStorage() {
        const dbConf = useNullableContext(DBConfContext)
        return () => IndexedDBBackend.destroyDB(dbConf.dbName)
    }
}