import React, { useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import { createIdbClients } from '@xnh-db/components';

createIdbClients().then(async clients => {
  const {character} = clients.collections
  const id = crypto.randomUUID()
  await character.putItem(id, {
    id,
    name: {
      zhs: "测试"
    },
    appearance: {
      hair: {
        color: ["蓝色"]
      }
    }
  }, new Date())
  // const result = await character.queryItems({keyPath: ["appearance", "hair", "color"], value: "蓝色"})
  const result = await character.queryFullText(["测", "试"])
  console.log(result)
})

function App() {
  const clients = React.useMemo(() => {
    return 
  }, [])
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
