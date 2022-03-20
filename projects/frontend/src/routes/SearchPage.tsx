import React, { CSSProperties, ReactNode, useState }  from 'react'
import { searchByKeywords, SearchResult } from '../actions/api';
import {Input, Card, AutoComplete } from 'antd'
import { useNavigate } from 'react-router-dom';

type SearchStatus = {status: 'pending'} | {status: 'success', data: SearchResult[]} | {status: 'failed', message: string} | {status: 'hidden'}

const searchResultsStyle: CSSProperties = {
  width: '90%',
  maxHeight: '80%',
  zIndex: 1000,
  position: 'absolute',
  marginLeft: '5%',
  marginRight: '5%'
}

function renderSearchResults(searchStatus: SearchStatus){
  if(searchStatus.status === 'hidden'){
    return null
  }
  const content = (
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
  )
  return <Card style={searchResultsStyle}>
    {content}
  </Card>
}

interface SearchCompleteItem {
  value: React.ReactNode
  key: string
  data: SearchResult
}

function renderSearchResultItem(data: SearchResult): SearchCompleteItem{
  return {
    key: data.documentId,
    value: data.title,
    data
  }
}

export function SearchPage(){
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({status: 'hidden'})
  const navigate = useNavigate()
  function onSelect(idx: ReactNode, item: SearchCompleteItem){
    navigate(`/item/${item.data.documentId}`)
  }
  function onSearch(s: string){
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
  const options = searchStatus.status === 'success' ? searchStatus.data.map(renderSearchResultItem) : []
  return <AutoComplete<ReactNode, SearchCompleteItem>
    style={{width: '100%'}}
    onSearch={onSearch}
    onSelect={onSelect}
    onDeselect={() => setSearchStatus({status: 'hidden'})}
    options={options}
    status={searchStatus.status === 'failed' ? 'error' : undefined}
    notFoundContent="没有搜索到结果"
  >
    <Input.Search 
      color="white"
      size="large" placeholder="搜索" enterButton
      loading={searchStatus.status === 'pending'}
      onSearch={() => {
        if(searchStatus.status === 'success' && searchStatus.data.length > 0){
          const target = searchStatus.data[0]
          onSelect(target.title, {value: target.title, key: target.documentId, data: target})
        }
      }}/>
    </AutoComplete>
}