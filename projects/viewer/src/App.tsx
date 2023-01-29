import React, { useEffect, useState } from 'react';
import './App.css';
import { createIdbClients, GlobalDataSynchronizationWrapper, OctokitClient } from '@xnh-db/components';
import { PathSyncClient, synchronizeCollection } from '@xnh-db/protocol';

function App() {
  const [idbClient, setClient] = useState<null | Awaited<ReturnType<typeof createIdbClients>>>()
  useEffect(() => {
    createIdbClients().then(clients => setClient(clients))
  }, [])

  return <GlobalDataSynchronizationWrapper>
    <div>emmm</div>
  </GlobalDataSynchronizationWrapper>
}

export default App;
