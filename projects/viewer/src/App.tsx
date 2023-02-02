import { DBSearchContextProvider, DBSearchInput, DBSearchResultList, GlobalDataSynchronizationWrapper } from '@xnh-db/components';
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
