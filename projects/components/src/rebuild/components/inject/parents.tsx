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
import { DbContexts } from "../context";

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
        const RichLayout = props.config.layout.layouts.entities[props.collectionName].previewItem
        const titles = props.config.layout.titles.entityTitles[props.collectionName]

        const {Empty, Loading} = DbContexts.useComponents()
        const comp = DbContexts.useProps().layout.global.endpoint.viewers

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
        const injectProps = InjectionProps.renderStaticPropTree(comp, colConf, parentItem, titles as any)
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
        const {Empty, Dialog} = DbContexts.useComponents()

        const internalComponent = props.binding.value ? 
            <StaticParentElement 
                config={props.config}
                clients={props.clients}
                collectionName={props.collectionName}
                itemId={props.binding.value}
            /> : <Empty simple/>

        return <>
            {internalComponent}
            <Dialog 
                open={showEditDialog}
                title="选择上级页面"
                width="middle"
                onCancel={() => {
                    selectedParentBinding.update(props.binding.value)
                    setShowEditDialog(false)
                }} 
                onOkay={() => {
                    props.binding.update(selectedParentBinding.value)
                    setShowEditDialog(false)
                }}
                >
                <SearchResultComponents.CollectionItemSelector 
                    collectionName={props.collectionName}
                    binding={selectedParentBinding}
                />
            </Dialog>
        </>
    }
}