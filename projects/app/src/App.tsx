import React, { useState } from 'react';
import './App.css';

import {DnDListComponents, DBWebUIProvider, ImageViewerComponents} from "@xnh-db/components"

function App() {
  const [list, setList] = useState<{name: string, data: Uint8Array}[]>([])

  const editor = DnDListComponents.ImageList.useImageListDialog({
    fileList: list.map(it => ({name: it.name, load: () => Promise.resolve(it.data)})),
    onComplete: setList
  })

  return (
    <div className="App">
      <DBWebUIProvider documentTypes={{}}>
        <ImageViewerComponents.ImageList fileList={list.map(it => ({name: it.name, load: () => Promise.resolve(it.data)}))}/>
        {editor.placeholder}
        <button onClick={editor.open}>打开</button>
      </DBWebUIProvider>
    </div>
  );
}

export default App;
