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
    await idbClient.online.collections.character.putItem(crypto.randomUUID(), {name: {zhs: "啊啊啊啊"}, appearance: {hair: {color: ["蓝色"]}}})
    const client = new OctokitClient()

    // const branchMaintenance = client.openBranchMaintenance({owner: "PineAG", repo: "tmp-test-repo", branch: "main"})
    // await branchMaintenance.backup()
    // await branchMaintenance.rollback("023ad3950787fedc01683d971a04c039a09afca3")
    // console.log()

    const repo = client.openRepo({owner: "PineAG", repo: "tmp-test-repo", branch: "main"})
    const collection = new PathSyncClient.Collection(repo)
    for await(const p of synchronizeCollection(collection, idbClient.offline.collections.character)) {
      console.log(p)
    }
  }
  return (
    <div>
      <button onClick={onClick}>更新时间戳</button>
    </div>
  );
}

export default App;
