import { PlusOutlined } from "@ant-design/icons"
import { CollectionSyncComponents, DBPages, DBSearchWrapper, Flex, SearchInputComponents, SearchResultComponents } from "@xnh-db/components"
import { Button, Card, Popconfirm } from "antd"
import { useEffect } from "react"
import { useNavigate } from "react-router"
import { XnhPath } from "./paths"
import { EditModeToolbar, useCollectionName, useItemId, useSearchQuery } from "./utils"

interface Props {
    collectionName: string
}

export function XnhView() {
    const itemId = useItemId()
    const collectionName = useCollectionName()
    const navigate = useNavigate()
    return <Flex direction="vertical">
        <EditModeToolbar>
            <Flex direction="horizontal">
                <ItemPageTitle prefix=""/>
                <Button onClick={() => navigate(XnhPath.editCollection(collectionName, itemId))}>编辑</Button>
            </Flex>
        </EditModeToolbar>
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

    return <Flex direction="vertical">
        <Card style={{margin: 8}}>
            <Flex direction="horizontal">
                <Button onClick={() => navigate(XnhPath.viewCollection(collectionName, itemId))}>取消</Button>
                <Button onClick={save}>保存</Button>
                    <Flex direction="horizontal">
                        <Popconfirm title="确认删除" onConfirm={remove} placement="bottom">
                            <Button danger type="default">删除</Button>
                        </Popconfirm>
                    </Flex>
            </Flex>
        </Card>
        <div>{editor}</div>
    </Flex>

    async function save() {
        await actions.save()
        await uploadCollection()
        navigate(XnhPath.viewCollection(collectionName, itemId))
    }

    async function remove() {
        await actions.remove()
        await uploadCollection()
        navigate(XnhPath.collectionHome(collectionName))
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
    const itemId = useItemId()
    const [editor, internalSave] = DBPages.useCreatePage(collectionName, itemId)
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
        navigate(XnhPath.viewCollection(collectionName, itemId))
    }
}

export function XnhSearch() {
    const collectionName = useCollectionName()
    const searchQuery = useSearchQuery()
    const navigate = useNavigate()
    
    return <DBSearchWrapper.SearchProvider
        collection={collectionName}
        searchQuery={searchQuery}
        onChange={q => navigate(XnhPath.searchCollection(collectionName, q))}
    >
        <ItemPageTitle prefix="搜索"/>
        <Flex direction="vertical">
            <EditModeToolbar>
                <Button 
                    icon={<PlusOutlined/>}
                    onClick={() => {
                        const newId = crypto.randomUUID()
                        navigate(XnhPath.createCollection(collectionName, newId))
                    }}
                >创建</Button>
            </EditModeToolbar>
            <SearchInputComponents.DBSearchInput/>
            <SearchResultComponents.ResultList/>
        </Flex>
    </DBSearchWrapper.SearchProvider>
}

function ItemPageTitle(props: {prefix: string}) {
    return <></>
}