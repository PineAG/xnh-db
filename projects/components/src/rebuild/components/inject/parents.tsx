import { Loading } from "@pltk/components"
import { Empty, Modal } from "antd"
import { useEffect, useState } from "react"
import { InheritanceUtils } from "../../data/inherit"
import { InjectionProps } from "./props"
import { DbUiConfiguration } from "../../config";

import GPBase = DbUiConfiguration.GlobalPropsBase
import CollNames = DbUiConfiguration.InternalUtils.CollNames
import { BackendBase } from "../../data"
import { FieldConfig } from "@xnh-db/protocol"
import { XBinding } from "../binding"
import { SearchResultComponents } from "../search"

export module InjectionParentComponents {
    interface StaticParentElementProps<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
    > {
        config: GP,
        clients: BackendBase.OnlineClientSet<GP["props"]>,
        collectionName: CollectionName,
        itemId: string
    }
    export function StaticParentElement<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
    >(props: StaticParentElementProps<GP, CollectionName>) {
        const [parentId, setParentId] = useState<string | null>(null)
        const [parentItem, setParentItem] = useState<FieldConfig.EntityBase | null>(null)
        const colConf = props.config.props.collections[props.collectionName].config
        const inheritable = props.config.props.collections[props.collectionName].inheritable
        const colClient = props.clients.collections[props.collectionName]
        const inheritClient = props.clients.inheritance[props.collectionName]
        const RichLayout = props.config.layout.layouts[props.collectionName].relationPreview.rich
        const titles = props.config.layout.titles.entityTitles[props.collectionName]

        useEffect(() => {
            if(inheritable && inheritClient) {
                initialize()
            }
        }, [props.collectionName])

        if(!inheritable || !inheritClient) {
            return <></>
        }
        if(parentId === null) {
            return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}/>
        }
        if(parentItem === null) {
            return <Loading/>
        }
        const injectProps = InjectionProps.renderStaticPropTree(colConf, parentItem, titles as any)
        return <RichLayout item={injectProps}/>

        async function initialize() {
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
        binding: XBinding.Binding<string | null>
    }
    export function ParentEditorElementProps<
        GP extends GPBase, 
        CollectionName extends CollNames<GP>
    >(props: ParentEditorElementProps<GP, CollectionName>) {
        const [showEditDialog, setShowEditDialog] = useState(false)
        const selectedParentBinding = XBinding.useBinding(props.binding.value)

        const internalComponent = props.binding.value ? 
            <StaticParentElement 
                config={props.config}
                clients={props.clients}
                collectionName={props.collectionName}
                itemId={props.binding.value}
            /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}/>

        return <>
            {internalComponent}
            <Modal open={showEditDialog}
                title="选择上级页面"
                onCancel={() => {
                    selectedParentBinding.update(props.binding.value)
                    setShowEditDialog(false)
                }} 
                onOk={() => {
                    props.binding.update(selectedParentBinding.value)
                    setShowEditDialog(false)
                }}
                >
                <SearchResultComponents.CollectionItemSelector 
                    collectionName={props.collectionName}
                    binding={selectedParentBinding}
                />
            </Modal>
        </>
    }
}