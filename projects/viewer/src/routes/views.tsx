import { CollectionSyncComponents, DbContexts, DBPages, DBSearchWrapper, Flex, SearchInputComponents, SearchResultComponents } from "@xnh-db/components"
import {useNavigate, useParams} from "react-router"
import {Button, Popconfirm} from "antd"

interface Props {
    collectionName: string
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

export function XnhView({collectionName}: Props) {
    const itemId = useItemId()
    const navigate = useNavigate()
    return <Flex direction="vertical">
        <Flex direction="horizontal">
            <Button onClick={() => navigate(`/${collectionName}/edit/${itemId}`)}>编辑</Button>
        </Flex>
        <DBPages.View collectionName={collectionName} itemId={itemId}/>
    </Flex>
}

export function XnhEdit({collectionName}: Props) {
    return <CollectionSyncComponents.Provider collection={collectionName}>
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

export function XnhCreate({collectionName}: Props) {

    return <CollectionSyncComponents.Provider collection={collectionName}>
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
        navigate(`/${collectionName}/view/${itemId}`)
    }
}

export function XnhSearch({collectionName}: Props) {
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
