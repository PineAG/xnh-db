import React from 'react';
import './App.css';
import { SearchBar } from './components/SearchBar';
import { RouteRoot } from './routes';



function App() {
  return (
    <div className="App">
      <SearchBar/>
      <RouteRoot/>
    </div>
  );
}

export default App;
