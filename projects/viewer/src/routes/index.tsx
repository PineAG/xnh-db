import {Routes, Route, Navigate} from "react-router"
import { CharacterEditor, CharacterSearch, CharacterViewer } from "./character"

export function XnhRoutes() {
    return <Routes>
        <Route path="" element={<Navigate to="/character/search"/>}/>
        <Route path="character">
            <Route path="search" element={<CharacterSearch/>}/>
            <Route path="view/:id" element={<CharacterViewer/>}/>
            <Route path="edit/:id" element={<CharacterEditor/>}/>
            <Route path="create"/>
        </Route>
    </Routes>
}