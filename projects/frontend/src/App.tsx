import React, { useState } from 'react';
import { searchByKeywords, SearchResult } from './actions/api';
import './App.css';

type SearchStatus = {status: 'pending'} | {status: 'success', data: SearchResult[]} | {status: 'failed', message: string} | {status: 'hidden'}

function App() {
  const [keywords, setKeywords] = useState('')
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({status: 'hidden'})
  const onKeywordsChange = async (s: string) => {
    setKeywords(s)
    if(s === ''){
      setSearchStatus({status: 'hidden'})
      return
    }
    setSearchStatus({status: 'pending'})
    searchByKeywords(s).then(data => {
      setSearchStatus({status: 'success', data})
    }).catch(err => {
      setSearchStatus({status: 'failed', message: err.toString()})
    })
  }
  
  return (
    <div className="App">
      <p>
        <input value={keywords} onChange={evt => onKeywordsChange(evt.target.value)}></input>
      </p>
      {searchStatus.status === 'hidden' ? null : (
        searchStatus.status === 'failed' ? (
          <p>Failed: {searchStatus.message}</p>
        ) :
        searchStatus.status === 'pending' ? (
          <p>Loading...</p>
        ) : // success
        <ul>
          {searchStatus.data.map(t => (
            <li>{t.documentId} / {t.title} ({t.tfidf})</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
