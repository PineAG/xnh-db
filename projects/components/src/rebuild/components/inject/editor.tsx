import { FieldConfig } from "@xnh-db/protocol";
import { XBinding } from "../binding";
import { DbContexts } from "../context";
import { GlobalSyncComponents } from "../sync";
import { Flex } from "../utils";
import { InjectionProps } from "./props";
import { useRelationUtils } from "./utils";
import {useState, useEffect} from "react"
import { DBSearchWrapper, SearchInputComponents, SearchResultComponents } from "../search";
import { LayoutInjector } from "./inject";

export module InternalEntityEditors {
    
    type PayloadEditorProps = {binding: XBinding.Binding<FieldConfig.EntityBase>, relationName: string}
    export function PayloadEditor(props: PayloadEditorProps): JSX.Element {
        const globalProps = DbContexts.useProps()
        const comp = globalProps.layout.global.endpoint.editors
        const payloadConfig = globalProps.props.relations[props.relationName].payloadConfig
        const InternalEditor = globalProps.layout.layouts.payloads[props.relationName].payloadEditor
        const payloadTitles = globalProps.layout.titles.payloadTitles[props.relationName]
        const payloadProps = InjectionProps.renderDynamicPropTree(comp, payloadConfig, props.binding, {}, payloadTitles)

        return <InternalEditor
            payload={payloadProps}
        />
    }

    type RelationKeys = Record<string, string>
    type RelationKeyEditor = {relationName: string, fixedKeys: RelationKeys, binding: XBinding.Binding<RelationKeys>}
    export function RelationKeyEditor(props: RelationKeyEditor): JSX.Element {
        const globalProps = DbContexts.useProps()
        return <Flex direction="vertical">
            {Object.keys(props.binding).map(key => {
                if(key in props.fixedKeys) {
                    return <></>
                } else {
                    const collectionName = globalProps.props.relations[props.relationName].collections[key]
                    const nextBinding = XBinding.propertyOf(props.binding).join(key)
                    return <EntitySelect
                        collectionName={collectionName}
                        binding={nextBinding}
                    />
                }
            })}
        </Flex>
    }

    type EntitySelectProps = {collectionName: string, binding: XBinding.Binding<string | undefined>}
    export function EntitySelect(props: EntitySelectProps) {
        const globalProps = DbContexts.useProps()
        const {ItemPreviewWrapper, Loading, Empty} = DbContexts.useComponents()
        const PreviewItem = globalProps.layout.layouts.entities[props.collectionName].previewPage

        const clients = GlobalSyncComponents.useQueryClients()
        const [item, setItem] = useState<LayoutInjector.SimplePageInjectionProps | "pending" | "empty">("pending")
        const [openSelect, setOpenSelect] = useState(false)

        const createSimpleProps = LayoutInjector.useCreateSimpleProps(props.collectionName)
        
        useEffect(() => {
            initialize()
        }, [props.binding.value])

        if(item === "pending") {
            return <Loading/>
        }

        return <ItemPreviewWrapper onClick={() => setOpenSelect(true)}>
            {
                item === "empty" ? <Empty simple/> :
                <PreviewItem {...item}/>
            }
            <SelectEntityDialog
                collectionName={props.collectionName}
                open={openSelect}
                itemId={props.binding.value}
                onCancel={() => setOpenSelect(false)}
                onSelect={id => {
                    props.binding.update(id)
                    setOpenSelect(false)
                }}
            />
        </ItemPreviewWrapper>

        async function initialize() {
            setItem("pending")
            if(props.binding.value) {
                const injection = await createSimpleProps(props.binding.value)
                setItem(injection)
            } else {
                setItem("empty")
            }
        }
    }

    type SelectEntityDialogProps = {collectionName: string, open: boolean, itemId: string, onCancel: () => void, onSelect: (id: string) => void, }
    export function SelectEntityDialog(props: SelectEntityDialogProps) {
        const globalProps = DbContexts.useProps()
        const {Dialog} = DbContexts.useComponents()
        const title = globalProps.layout.titles.entityTitles[props.collectionName]["$title"]
        const [query, setQuery] = useState("")
        const idBinding = XBinding.useBinding(props.itemId)

        return <Dialog
                title={`选择 ${title}`}
                open={props.open}
                width="large"
                onCancel={props.onCancel}
                onOkay={() => {
                    props.onSelect(idBinding.value)
                }}
            >
            <DBSearchWrapper.SearchProvider collection={props.collectionName} searchQuery={query} onChange={setQuery}>
                <Flex direction="vertical">
                    <SearchInputComponents.DBSearchInput/>
                    <SearchResultComponents.CollectionItemSelector collectionName={props.collectionName} binding={idBinding}/>
                </Flex>
            </DBSearchWrapper.SearchProvider>
        </Dialog>
    }

    type RelationEditDialogProps = {
        open: boolean, 
        fixedKeys: RelationKeys,
        initialKeys: RelationKeys
        initialPayload: FieldConfig.EntityBase
        relationName: string
        onCancel: () => void, 
        onOk: (payload: FieldConfig.EntityBase, keys: RelationKeys) => void,
    }
    export function RelationEditDialog(props: RelationEditDialogProps) {
        const {Dialog} = DbContexts.useComponents()
        const payloadBinding = XBinding.useBinding(props.initialPayload)
        const relationKeyBinding = XBinding.useBinding(props.initialKeys)

        return <Dialog 
            title="编辑关系" 
            width="large"
            open={props.open}
            onCancel={props.onCancel}
            onOkay={onCreate}
        >
            <Flex direction="vertical">
                <PayloadEditor binding={payloadBinding} relationName={props.relationName}/>
                <RelationKeyEditor relationName={props.relationName} fixedKeys={props.fixedKeys} binding={relationKeyBinding}/>
            </Flex>
        </Dialog>

        function onCreate() {
            props.onOk(payloadBinding.value, {
                ...relationKeyBinding.value,
                ...props.fixedKeys
            })
        }
    }
}