import { Navigate, Route, Routes } from "react-router"
import { NotFound, PageWrapper } from "./utils"
import { XnhCreate, XnhEdit, XnhList, XnhSearch, XnhView } from "./views"

function InternalRoutes() {
    return <Routes>
        <Route path="" element={<Navigate to="/collection/character"/>}/>
        <Route path="collection/:collectionName">
            <Route path="" element={
                <PageWrapper>
                    <XnhList/>
                </PageWrapper>
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
            <Route path="create/:itemId" element={
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