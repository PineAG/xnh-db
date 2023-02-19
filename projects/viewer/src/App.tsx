import { GlobalSyncComponents, DbContexts, XnhUiConfiguration, DBSearch, DBSearchWrapper } from '@xnh-db/components';
import { HashRouter, useNavigate } from "react-router-dom";
import './App.css';
import { RootRoutes } from './routes';

function useOpenSearch(collectionName: string) {
  const navigate = useNavigate()
  return (query: DBSearch.IQuery) => {
    navigate(`/${collectionName}/search/${DBSearchWrapper.stringifyQuery(query)}`)
  }
}

function useOpenItem(collectionName: string) {
  const navigate = useNavigate()
  return (itemId: string) => {
    navigate(`/${collectionName}/view/${itemId}`)
  }
}

function AppInternal() {  
  return <DbContexts.AppProvider
      config={XnhUiConfiguration.config} 
      layout={XnhUiConfiguration.layouts}
      dbName="xnh-db-test"
      actions={{useOpenSearch, useOpenItem}}
    >
      <GlobalSyncComponents.GlobalDataSynchronizationWrapper>
        <RootRoutes/>
      </GlobalSyncComponents.GlobalDataSynchronizationWrapper>
  </DbContexts.AppProvider>
}

function App() {
  return <HashRouter>
    <AppInternal/>
  </HashRouter>
}

export default App;
