import { useEffect, useState } from "react"
import { InheritanceUtils } from "../../data/inherit"
import { InjectionProps } from "./props"
import { DbUiConfiguration } from "../../config";

import GPBase = DbUiConfiguration.GlobalPropsBase
import CollNames = DbUiConfiguration.InternalUtils.CollNames
import { BackendBase } from "../../data"
import { FieldConfig } from "@xnh-db/protocol"
import { XBinding } from "../binding"
import { DBSearchWrapper, SearchInputComponents, SearchResultComponents } from "../search"
import { DbContexts } from "../context";
import { GlobalSyncComponents } from "../sync";
import { LayoutInjector } from "./inject";
import { Flex } from "../utils";

export module InjectionParentComponents {
    type SimpleInjection = DbUiConfiguration.InternalUtils.Injection.SimplePageInjectionProps<GPBase, string>
    interface ItemViewProps {
        itemId: string
        collectionName: string
        style?: React.CSSProperties
        onClick?: () => void
    }
    export function ItemView(props: ItemViewProps) {
        const [injectionProps, setInjection] = useState<SimpleInjection | null>(null)
        const config = DbContexts.useProps()
        const {Card, Loading} = DbContexts.useComponents()
        const ResultLayout = config.layout.layouts.entities[props.collectionName].searchResult

        const createSimpleProps = LayoutInjector.useCreateSimpleProps(props.collectionName)

        useEffect(() => {
            initialize()
        }, [props.collectionName, props.itemId])

        if(injectionProps === null) {
            return <Loading/>
        } else {
            return <Card onClick={props.onClick} style={props.style}>
                <ResultLayout {...injectionProps}/>
            </Card>
        }

        async function initialize() {
            const injection = await createSimpleProps(props.itemId)
            setInjection(injection)
        }
        
    }

    interface StaticParentElementProps {
        collectionName: string,
        itemId: string
    }
    export function StaticParentElement(props: StaticParentElementProps) {
        const [parentId, setParentId] = useState<string | null>(null)
        const [parentItem, setParentItem] = useState<FieldConfig.EntityBase | null>(null)

        const globalProps = DbContexts.useProps()
        const clients = GlobalSyncComponents.useQueryClients()

        const colConf = globalProps.props.collections[props.collectionName].config
        const inheritable = globalProps.props.collections[props.collectionName].inheritable
        const colClient = clients.collections[props.collectionName]
        const inheritClient = clients.inheritance[props.collectionName]
        const RichLayout = globalProps.layout.layouts.entities[props.collectionName].previewItem
        const titles = globalProps.layout.titles.entityTitles[props.collectionName]

        const {Empty, Loading, ItemPreviewWrapper} = DbContexts.useComponents()
        const openItem = globalProps.actions.useOpenItem(props.collectionName)

        const renderTree = InjectionProps.useRenderStaticPropTree(props.collectionName)

        useEffect(() => {
            if(inheritable && inheritClient) {
                initialize()
            }
        }, [props.collectionName])

        if(!inheritable || !inheritClient) {
            return <></>
        }
        if(parentId === null) {
            return <Empty simple/>
        }
        if(parentItem === null) {
            return <Loading/>
        }
        const injectProps = renderTree(colConf, parentItem, titles as any)
        return <ItemPreviewWrapper onClick={() => {
            if(parentId){
                openItem(parentId)
            }
        }}>
            <RichLayout item={injectProps}/>
        </ItemPreviewWrapper>

        async function initialize() {
            if(!inheritClient) {
                console.warn(`Not inheritable: ${props.collectionName}`)
                return;
            }
            const parentId = await InheritanceUtils.getParentId(props.itemId, inheritClient)
            setParentId(parentId)
            if(parentId === null) return;
            const parentItem = await InheritanceUtils.getEntityPatchingParents(parentId, colConf, colClient, inheritClient)
            setParentItem(parentItem)
        }
    }

    interface ParentEditorElementProps<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
    > {
        config: GP,
        clients: BackendBase.OnlineClientSet<GP["props"]>,
        collectionName: CollectionName,
        binding: XBinding.Binding<string | null>,
        itemId: string
    }
    export function ParentEditorElement<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
    >(props: ParentEditorElementProps<GP, CollectionName>) {
        const [showEditDialog, setShowEditDialog] = useState(false)
        const selectedParentBinding = XBinding.useBinding(props.binding.value)
        const {Empty, Dialog} = DbContexts.useComponents()
        const clients = GlobalSyncComponents.useQueryClients()
        const inheritClient = clients.inheritance[props.collectionName]

        if(!inheritClient) {
            return <></>
        }

        const [query, setQuery] = useState("")

        const internalComponent = props.binding.value ? 
            <ItemView
                collectionName={props.collectionName}
                itemId={props.binding.value}
            /> : <Empty simple/>

        return <>
            <div onClick={() => setShowEditDialog(true)}>
                {internalComponent}
            </div>
            <Dialog 
                open={showEditDialog}
                title="选择上级页面"
                width="middle"
                onCancel={() => {
                    selectedParentBinding.update(props.binding.value)
                    setShowEditDialog(false)
                    setQuery("")
                }} 
                onOkay={async () => {
                    if(selectedParentBinding.value) {
                        if(selectedParentBinding.value === props.itemId) {
                            return
                        }
                        const isValidParent = await InheritanceUtils.isValidateParentId(props.itemId, selectedParentBinding.value, inheritClient)
                        if(!isValidParent) {
                            return
                        }
                    }
                    props.binding.update(selectedParentBinding.value)
                    setShowEditDialog(false)
                    setQuery("")
                }}
                >
                <DBSearchWrapper.SearchProvider collection={props.collectionName} searchQuery={query} onChange={setQuery}>
                    <SearchInputComponents.DBSearchInput />
                    <SearchResultComponents.CollectionItemSelector 
                        collectionName={props.collectionName}
                        binding={selectedParentBinding}
                    />
                </DBSearchWrapper.SearchProvider>
            </Dialog>
        </>
    }

    interface StaticChildrenElementProps {
        collectionName: string,
        itemId: string,
        enableOpenItem?: boolean
    }
    export function StaticChildrenElement(props: StaticChildrenElementProps) {
        const globalProps = DbContexts.useProps()
        const clients = GlobalSyncComponents.useQueryClients()
        const [children, setChildren] = useState<string[]>([])
        const openItem = globalProps.actions.useOpenItem(props.collectionName)

        useEffect(() => {
            initialize()
        }, [props.collectionName, props.itemId])

        return <Flex direction="vertical">
            {children.map(id => (
                <ItemView
                    key={id}
                    itemId={id}
                    collectionName={props.collectionName}
                    onClick={() => {
                        if(props.enableOpenItem) {
                            openItem(id)
                        }
                    }}
                />
            ))}
        </Flex>

        async function initialize() {
            const inheritClient = clients.inheritance[props.collectionName]
            if(!inheritClient) return;
            const children = await InheritanceUtils.getChildren(props.itemId, inheritClient)
            setChildren(children)
        }
    } 
}