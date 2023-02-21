import { XnhUiConfiguration } from "@xnh-db/components"
import {Routes, Route, Navigate} from "react-router"
import { NotFound, PageWrapper } from "./utils"
import { XnhCreate, XnhEdit, XnhSearch, XnhView } from "./views"
import {Layout, Menu} from "antd"


const collections: (keyof typeof XnhUiConfiguration.config.collections)[] = ["character", "artwork", "voiceActor", "creator"]

function InternalRoutes() {
    return <Routes>
        <Route path="" element={<Navigate to="/collection/character/search"/>}/>
        <Route path="collection/:collectionName">
            <Route path="" element={
                <Navigate to="search"/>
            }/>
            <Route path="search" element={
                <PageWrapper>
                    <XnhSearch/>
                </PageWrapper>
            }/>
            <Route path="search/:searchQuery" element={
                <PageWrapper>
                    <XnhSearch/>
                </PageWrapper>
            }/>
            <Route path="view/:itemId" element={
                <PageWrapper>
                    <XnhView/>
                </PageWrapper>
            }/>
            <Route path="edit/:itemId" element={
                <PageWrapper>
                    <XnhEdit/>
                </PageWrapper>
            }/>
            <Route path="create" element={
                <PageWrapper>
                    <XnhCreate/>
                </PageWrapper>
            }/>
        </Route>
        <Route path="*" element={<NotFound/>}/>
    </Routes>
}

export function RootRoutes(){
    return <InternalRoutes/>
}