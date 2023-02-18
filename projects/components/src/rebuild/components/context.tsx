import { BackendBase, DBStorage, IndexedDBBackend, OctokitBackend } from "../data"
import {useContext, createContext} from "react"
import { DbUiConfiguration, InternalGlobalLayouts } from "../config";

type NullableContextValue<T> = {state: "pending", message: string} | {state: "available", value: T}
export type NullableContext<T> = {
    context: React.Context<NullableContextValue<T>>
    Provider: React.FC<{value: T, children: React.ReactNode}>
    Consumer: React.FC<{children: (value: T) => React.ReactNode}>
}

export function createNullableContext<T = never>(message: string): NullableContext<T> {
    const context = createContext<NullableContextValue<T>>({state: "pending", message})
    const Provider = (props: {value: T, children: React.ReactNode}) => (<context.Provider value={{state: "available", value: props.value}}>
        {props.children}
    </context.Provider>)
    const Consumer = (props: {children: (value: T) => React.ReactNode}) => (<context.Consumer>{
            (value) => {
                if(value.state === "pending") {
                    throw new Error(value.message)
                }
                return props.children(value.value)
            }
        }</context.Consumer>)
    return {context, Provider, Consumer}

}
export function useNullableContext<T>(context: NullableContext<T>): T {
    const state = useContext(context.context)
    if(state.state === "pending") {
        throw new Error(state.message)
    }
    return state.value
}


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

    export function useMockClientsBuilder() {
        const dbConf = useNullableContext(DBConfContext)
        const props = useProps()
        return () => DBStorage.createMemoryStorage(props.props, dbConf.dbName)
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

    export function useComponents(): InternalGlobalLayouts.GlobalComponents {
        const props = useProps()
        return props.layout.global.components
    }
}