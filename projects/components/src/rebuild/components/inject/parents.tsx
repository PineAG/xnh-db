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

export module InjectionParentComponents {
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

        console.log("WTF??", props.binding.value)
        const internalComponent = props.binding.value ? 
            <StaticParentElement
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
}