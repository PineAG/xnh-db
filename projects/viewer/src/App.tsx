import React, { useEffect, useState } from 'react';
import './App.css';
import { Button, createIdbClients, DBLoginButton, GlobalDataSynchronizationWrapper, OctokitClient, useDBClients, useSyncDialog } from '@xnh-db/components';
import { PathSyncClient, synchronizeCollection } from '@xnh-db/protocol';
import { Input } from 'antd';


function Body() {
  const showSyncDialog = useSyncDialog()
  const clients = useDBClients()

  const [name, setName] = useState("")

  async function addItem() {
    const characterClient = clients.query.collections.character
    characterClient.putItem(crypto.randomUUID(), {
      title: name,
      appearance: {
        eyes: {
          color: ["蓝色"]
        }
      }
    })
    await showSyncDialog("角色", synchronizeCollection(clients.local.collections.character, clients.remote.collections.character))
  } 

  return <>
    <Input value={name} onChange={evt => setName(evt.target.value)}/>
    <Button onClick={addItem}>添加项目</Button>
    <div>emmm</div>
    <DBLoginButton/>
  </>
}

function App() {
  return <GlobalDataSynchronizationWrapper>
    <Body/>
  </GlobalDataSynchronizationWrapper>
}

export default App;
