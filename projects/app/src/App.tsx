import React, { useState } from 'react';
import './App.css';

import {DnDListComponents, DBWebUIProvider} from "@xnh-db/components"

function App() {
  const [list, setList] = useState<{name: string, data: Uint8Array}[]>([])

  const editor = DnDListComponents.ImageList.useImageListDialog({
    fileList: list,
    onComplete: setList
  })

  return (
    <div className="App">
      <DBWebUIProvider>
        {editor.placeholder}
        <button onClick={editor.open}>打开</button>
      </DBWebUIProvider>
    </div>
  );
}

export default App;
