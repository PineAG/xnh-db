import React from 'react';
import './App.css';

import {DBWebUIProvider, ImageViewerComponents} from "@xnh-db/components"

function App() {
  const upload = ImageViewerComponents.useUploadImageDialog({
    onUpload: () => {}
  })

  return (
    <div className="App">
      <DBWebUIProvider>
        <button onClick={upload.open}>上传</button>
        {upload.placeholder}
      </DBWebUIProvider>
    </div>
  );
}

export default App;
