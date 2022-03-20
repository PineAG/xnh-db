import React from 'react';
import './App.css';
import 'antd/dist/antd.css'
import {Layout} from 'antd'
import { SearchBar } from './components/SearchBar';
import { RouteRoot } from './routes';
import { HashRouter } from 'react-router-dom';



function App() {
  return (
    <div className="App">
      <HashRouter>
        <Layout>
          <Layout.Header style={{height: '80px'}}>
            <SearchBar/>
          </Layout.Header>
          <Layout.Content>
            <RouteRoot/>
          </Layout.Content>
          <Layout.Footer/>
        </Layout>
      </HashRouter>
    </div>
  );
}

export default App;
