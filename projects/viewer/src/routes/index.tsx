import { DbContexts } from "@xnh-db/components"
import {Routes, Route, Navigate} from "react-router"
import { XnhCreate, XnhEdit, XnhSearch, XnhView } from "./views"

export function RootRoutes() {
    const globalProps = DbContexts.useProps()
    return <Routes>
        <Route path="" element={<Navigate to="/character/search"/>}/>
        {Object.keys(globalProps.props.collections).map(collectionName => {
            return <Route path={collectionName} key={collectionName}>
                <Route path="" element={<Navigate to="search"/>}/>
                <Route path="search" element={<XnhSearch collectionName={collectionName}/>}/>
                <Route path="search/:searchQuery" element={<XnhSearch collectionName={collectionName}/>}/>
                <Route path="view/:itemId" element={<XnhView collectionName={collectionName}/>}/>
                <Route path="edit/:itemId" element={<XnhEdit collectionName={collectionName}/>}/>
                <Route path="create" element={<XnhCreate collectionName={collectionName}/>}/>
            </Route>
        })}
    </Routes>
}