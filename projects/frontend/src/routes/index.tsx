import React from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Home } from './Home'
import { ItemPage } from './ItemPage'


export function RouteRoot() {
    return <HashRouter>
        <Routes>
            <Route path='/' element={<Home/>} />
            <Route path='/item/:itemId' element={<ItemPage/>} />
        </Routes>
    </HashRouter>
}
