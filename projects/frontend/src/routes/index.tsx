import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { Home } from './Home'
import { ItemPage } from './ItemPage'


export function RouteRoot() {
    return <Routes>
            <Route path='/' element={<Home/>} />
            <Route path='/item/:itemId' element={<ItemPage/>} />
        </Routes>
}
