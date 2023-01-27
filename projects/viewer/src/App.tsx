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
      zhs: Math.random() < 0.5 ? "测试": "test"
    },
    appearance: {
      hair: {
        color: ["蓝色", "绿色"]
      }
    }
  }, new Date())
  // const result = await character.queryItems({keyPath: ["name", "zhs"], value: "测试"})
  const result = await character.queryItems({keyPath: ["appearance", "hair", "color"], value: "绿色"})
  // const result = await character.queryFullText(["test"])
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
