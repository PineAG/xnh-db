import React, { useEffect, useState } from 'react';
import './App.css';
import { createIdbClients, OctokitClient } from '@xnh-db/components';
import { PathSyncClient, synchronizeCollection } from '@xnh-db/protocol';

function App() {
  const [idbClient, setClient] = useState<null | Awaited<ReturnType<typeof createIdbClients>>>()
  useEffect(() => {
    createIdbClients().then(clients => setClient(clients))
  }, [])

  async function onClick() {
    if(!idbClient) {
      return
    }
    const client = new OctokitClient()
    // const repo = client.openRepo({owner: "PineAG", repo: "tmp-test-repo"})
    // // console.log()
    // const collection = new PathSyncClient.Collection(repo)
    // for await(const p of synchronizeCollection(idbClient.offline.collections.character, collection)) {
    //   console.log(p)
    // }
  }
  return (
    <div>
      <button onClick={onClick}>更新时间戳</button>
    </div>
  );
}

export default App;
