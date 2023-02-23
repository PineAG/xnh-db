import { AuthorizationComponents, Flex, GlobalSyncComponents, XnhUiConfiguration } from "@xnh-db/components"
import {Card, Layout, Menu} from "antd"
import { useNavigate, useParams } from "react-router-dom"

type CollectionName = keyof typeof XnhUiConfiguration.config.collections
export const collections: CollectionName[] = ["character", "artwork", "voiceActor", "creator"]

export function NotFound() {
    return <p>该页面不存在</p>
}

function useCollectionNameUnsafe(): string | null {
    const params = useParams()
    const itemId = params["collectionName"]
    if(itemId) {
        return itemId
    } else {
        return null
    }
}

export function useCollectionName(): CollectionName {
    const collectionName = useCollectionNameUnsafe()
    if(collections.some(it => it === collectionName)) {
        return collectionName as CollectionName
    } else {
        throw new Error(`Invalid collection: ${collectionName}`)
    }
}

export function useItemIdUnsafe(): string | null {
    const params = useParams()
    const itemId = params["itemId"]
    return itemId ?? null
}

export function useItemId(): string {
    const itemId = useItemIdUnsafe()
    if(itemId) {
        return itemId
    } else {
        throw new Error(`Invalid itemId: ${itemId}`)
    }
}

export function useSearchQuery(): string {
    const params = useParams()
    const query = params["searchQuery"]
    return query ?? ""
}

export function PageWrapper(props: {children: React.ReactNode}) {
    const navigate = useNavigate()
    const collectionName = useCollectionNameUnsafe()
    const [authPlaceholder, authState] = AuthorizationComponents.useAuth(() => {window.location.reload()})
    return <Layout>
        <Layout.Header>
            <Menu
                theme="dark"
                mode="horizontal"
                selectedKeys={[collectionName ?? ""]}
                items={[
                    ...collections.map(colName => {
                        const title = XnhUiConfiguration.layouts.titles.entityTitles[colName].$title
                        return {
                            label: title,
                            key: colName,
                            onClick: () => navigate(`/collection/${colName}`)
                        }
                    }), (
                        authState.state === "online" ? {
                            label: "退出编辑模式",
                            onClick: authState.logout,
                            key: "login"
                        } :
                        authState.state === "offline" ? {
                            label: "进入编辑模式",
                            onClick: authState.login,
                            key: "login"
                        } : {
                            label: "等待中",
                            key: "login"
                        }
                    )

                ]}
            />
        </Layout.Header>
        <Layout.Content>
            {props.children}
            {authPlaceholder}
        </Layout.Content>
    </Layout>
}

export function EditModeToolbar(props: {children: React.ReactNode}) {
    const {mode} = GlobalSyncComponents.useClients()
    return <Card style={{margin: 8, display: mode === "online" ? "block" : "none"}}>
        <Flex direction="horizontal">
            {props.children}
        </Flex>
    </Card>
}