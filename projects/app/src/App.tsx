import React, { useState } from 'react';
import './App.css';

import {DnDListComponents, DBWebUIProvider} from "@xnh-db/components"

function App() {
  const [list, setList] = useState<string[]>([])

  return (
    <div className="App">
      <DBWebUIProvider>
      <DnDListComponents.ImageList.ImageList
        columns={3}
        idList={list}
        onComplete={setList}
        load={() => {throw new Error("SHIT")}}
        upload={() => {throw new Error("SHIT")}}
      />
      </DBWebUIProvider>
    </div>
  );
}

export default App;
