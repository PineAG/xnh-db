import React, { useState } from 'react';
import './App.css';

import {DBWebUIProvider, ImageViewerComponents} from "@xnh-db/components"

function App() {
  const [url, setUrl] = useState<string | null>(null)

  const upload = ImageViewerComponents.useUploadImageDialog({
    onUpload: (data) => {
      if(url) {
        URL.revokeObjectURL(url)
      }
      setUrl(URL.createObjectURL(new Blob([data])))
    }
  })

  return (
    <div className="App">
      <DBWebUIProvider>
        <button onClick={upload.open}>上传</button>
        {upload.placeholder}
      </DBWebUIProvider>
      <img src={url ?? ""}/>
    </div>
  );
}

export default App;
