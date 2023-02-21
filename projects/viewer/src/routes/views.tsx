import { CollectionSyncComponents, DbContexts, DBPages, DBSearchWrapper, Flex, GlobalSyncComponents, SearchInputComponents, SearchResultComponents, XnhUiConfiguration } from "@xnh-db/components"
import {useNavigate, useParams} from "react-router"
import {Button, Popconfirm} from "antd"
import {useItemId, useCollectionName, useSearchQuery} from "./utils"

interface Props {
    collectionName: string
}



export function XnhView() {
    const itemId = useItemId()
    const collectionName = useCollectionName()
    const navigate = useNavigate()
    return <Flex direction="vertical">
        <Flex direction="horizontal">
            <ItemPageTitle prefix=""/>
            <Button onClick={() => navigate(`/collection/${collectionName}/edit/${itemId}`)}>编辑</Button>
        </Flex>
        <DBPages.View collectionName={collectionName} itemId={itemId}/>
    </Flex>
}

export function XnhEdit() {
    const collectionName = useCollectionName()
    return <CollectionSyncComponents.Provider collection={collectionName}>
        <ItemPageTitle prefix="搜索"/>
        <EditInternal collectionName={collectionName}/>
    </CollectionSyncComponents.Provider>
}

function EditInternal({collectionName}: Props) {
    const navigate = useNavigate()
    const itemId = useItemId()
    const [editor, actions] = DBPages.useEditPage(collectionName, itemId)
    const uploadCollection = CollectionSyncComponents.useUploadCollection()

    DBPages.useEditPage(collectionName, itemId)

    return <Flex direction="vertical">
        <Flex direction="horizontal">
            <Button onClick={() => navigate(`/collection/${collectionName}/view/${itemId}`)}>取消</Button>
            <Button onClick={save}>保存</Button>
                <Flex direction="horizontal">
                    <Popconfirm title="确认删除" onConfirm={remove} placement="bottom">
                        <Button danger type="default">删除</Button>
                    </Popconfirm>
                </Flex>
        </Flex>
        <div>{editor}</div>
    </Flex>

    async function save() {
        await actions.save()
        await uploadCollection()
        navigate(`/collection/${collectionName}/view/${itemId}`)
    }

    async function remove() {
        await actions.remove()
        await uploadCollection()
        navigate(`/collection/${collectionName}/search`)
    }

}

export function XnhCreate() {
    const collectionName = useCollectionName()
    return <CollectionSyncComponents.Provider collection={collectionName}>
        <ItemPageTitle prefix="创建"/>
        <CreateInternal collectionName={collectionName}/>
    </CollectionSyncComponents.Provider>
}

function CreateInternal({collectionName}: Props) {
    const navigate = useNavigate()
    const [editor, internalSave] = DBPages.useCreatePage(collectionName)
    const uploadCollection = CollectionSyncComponents.useUploadCollection()

    return <Flex direction="vertical">
        <Flex direction="horizontal">
            <Button onClick={save}>保存</Button>
        </Flex>
        <div>{editor}</div>
    </Flex>

    async function save() {
        const itemId = await internalSave()
        await uploadCollection()
        navigate(`/collection/${collectionName}/view/${itemId}`)
    }
}

export function XnhSearch() {
    const collectionName = useCollectionName()
    const searchQuery = useSearchQuery()
    const navigate = useNavigate()
    
    return <DBSearchWrapper.SearchProvider
        collection={collectionName}
        searchQuery={searchQuery}
        onChange={q => navigate(`/collection/${collectionName}/search/${q}`)}
    >
        <ItemPageTitle prefix="搜索"/>
        <Flex direction="vertical">
            <SearchInputComponents.DBSearchInput/>
            <SearchResultComponents.ResultList/>
        </Flex>
    </DBSearchWrapper.SearchProvider>
}

function ItemPageTitle(props: {prefix: string}) {
    return <></>
}