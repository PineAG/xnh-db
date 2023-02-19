import { CollectionSyncComponents, DbContexts, DBPages, DBSearchWrapper, Flex, SearchInputComponents, SearchResultComponents } from "@xnh-db/components"
import {useNavigate, useParams} from "react-router"
import {Button, Popconfirm} from "antd"

function useCollectionName(): string {
    const globalProps = DbContexts.useProps()
    const params = useParams()
    const collectionName = params["collectionName"]
    if(collectionName && collectionName in globalProps.props.collections) {
        return collectionName
    } else {
        throw new Error(`Invalid collectionName: ${collectionName}`)
    }
}

function useItemId(): string {
    const params = useParams()
    const itemId = params["itemId"]
    if(itemId) {
        return itemId
    } else {
        throw new Error(`Invalid itemId: ${itemId}`)
    }
}

function useSearchQuery(): string {
    const params = useParams()
    const query = params["searchQuery"]
    return query ?? ""
}

export function XnhView() {
    const collectionName = useCollectionName()
    const itemId = useItemId()
    const navigate = useNavigate()
    return <Flex direction="vertical">
        <Flex direction="horizontal">
            <Button onClick={() => navigate(`/${collectionName}/edit/${itemId}`)}>编辑</Button>
        </Flex>
        <DBPages.View collectionName={collectionName} itemId={itemId}/>
    </Flex>
}

export function XnhEdit() {
    const collectionName = useCollectionName()

    return <CollectionSyncComponents.Provider collection={collectionName}>
        <EditInternal/>
    </CollectionSyncComponents.Provider>
}

function EditInternal() {
    const collectionName = useCollectionName()
    const navigate = useNavigate()
    const itemId = useItemId()
    const [editor, actions] = DBPages.useEditPage(collectionName, itemId)
    const uploadCollection = CollectionSyncComponents.useUploadCollection()

    DBPages.useEditPage(collectionName, itemId)

    return <Flex direction="vertical">
        <Flex direction="horizontal">
            <Button onClick={() => navigate(`/${collectionName}/view/${itemId}`)}>取消</Button>
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
        navigate(`/${collectionName}/view/${itemId}`)
    }

    async function remove() {
        await actions.remove()
        await uploadCollection()
        navigate(`/${collectionName}/search`)
    }

}

export function XnhCreate() {
    const collectionName = useCollectionName()

    return <CollectionSyncComponents.Provider collection={collectionName}>
        <CreateInternal/>
    </CollectionSyncComponents.Provider>
}

function CreateInternal() {
    const navigate = useNavigate()
    const collectionName = useCollectionName()
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
        navigate(`/${collectionName}/view/${itemId}`)
    }
}

export function XnhSearch() {
    const collectionName = useCollectionName()
    const searchQuery = useSearchQuery()
    const navigate = useNavigate()
    
    return <DBSearchWrapper.SearchProvider
        collection={collectionName}
        searchQuery={searchQuery}
        onChange={q => navigate(`/${collectionName}/search/${q}`)}
    >
        <Flex direction="vertical">
            <SearchInputComponents.DBSearchInput/>
            <SearchResultComponents.ResultList/>
        </Flex>
    </DBSearchWrapper.SearchProvider>
}
