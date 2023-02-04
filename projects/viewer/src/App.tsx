import { DBSearchContextProvider, DBSearchInput, DBSearchResultList, GlobalDataSynchronizationWrapper, SearchItemOpenerProvider } from '@xnh-db/components';
import { DBDeclaration } from '@xnh-db/protocol';
import './App.css';


function App() {
  return <GlobalDataSynchronizationWrapper>
    <DBSearchContextProvider collection="character">
        <DBSearchInput collection="character"/>
        <DBSearchResultList collection="character"/>
    </DBSearchContextProvider>
  </GlobalDataSynchronizationWrapper>
}

export default App;
