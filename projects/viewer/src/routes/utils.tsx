import { XnhUiConfiguration } from "@xnh-db/components"
import {Layout, Menu} from "antd"
import { useNavigate, useParams } from "react-router-dom"

export const collections: (keyof typeof XnhUiConfiguration.config.collections)[] = ["character", "artwork", "voiceActor", "creator"]

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

export function useCollectionName(): string {
    const collectionName = useCollectionNameUnsafe()
    if(collections.some(it => it === collectionName)) {
        return collectionName as string
    } else {
        throw new Error(`Invalid collection: ${collectionName}`)
    }
}

export function useItemId(): string {
    const params = useParams()
    const itemId = params["itemId"]
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
    return <Layout>
        <Layout.Header>
            <Menu
                theme="dark"
                mode="horizontal"
                selectedKeys={[collectionName ?? ""]}
                items={collections.map(colName => {
                    const title = XnhUiConfiguration.layouts.titles.entityTitles[colName].$title
                    return {
                        label: title,
                        key: colName,
                        onClick: () => navigate(`/collection/${colName}`)
                    }
                })}
            />
        </Layout.Header>
        <Layout.Content>
            {props.children}
        </Layout.Content>
    </Layout>
}
