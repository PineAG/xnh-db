import {Routes, Route, Navigate} from "react-router"
import { XnhCreate, XnhEdit, XnhSearch, XnhView } from "./views"

export function RootRoutes() {
    return <Routes>
        <Route path="" element={<Navigate to="/character/search"/>}/>
        <Route path=":collectionName">
            <Route path="search" element={<XnhSearch/>}/>
            <Route path="search/:searchQuery" element={<XnhSearch/>}/>
            <Route path="view/:itemId" element={<XnhView/>}/>
            <Route path="edit/:itemId" element={<XnhEdit/>}/>
            <Route path="create" element={<XnhCreate/>}/>
        </Route>
    </Routes>
}