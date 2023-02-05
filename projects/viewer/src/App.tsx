import { DBLoginButton, DBSearchContextProvider, GlobalDataSynchronizationWrapper } from '@xnh-db/components';
import { HashRouter } from "react-router-dom";
import './App.css';
import { XnhRoutes } from './routes';


function App() {
  return <GlobalDataSynchronizationWrapper>
    <DBSearchContextProvider collection="character">
        <HashRouter>
          <XnhRoutes/>
        </HashRouter>
        <DBLoginButton/>
    </DBSearchContextProvider>
  </GlobalDataSynchronizationWrapper>
}

export default App;
