import { FieldConfig } from "@xnh-db/protocol";
import { XBinding } from "../components/binding";
import {useCallback} from "react"
import { DbContexts } from "../components/context";

export module InternalGlobalLayouts {
    export type EndpointEditorProps<N extends FieldConfig.Fields.EndpointNames> = {
        binding: XBinding.Binding<FieldConfig.Fields.ValueType<N> | undefined>
        config: FieldConfig.Fields.FieldTypes[N]
        parentValue: FieldConfig.Fields.ValueType<N> | undefined
    }
    export type EndpointEditors = {
        [E in FieldConfig.Fields.EndpointNames]: React.FC<EndpointEditorProps<E>>
    }
    
    export type EndpointViewerProps<N extends FieldConfig.Fields.EndpointNames> = {
        value: FieldConfig.Fields.ValueType<N> | undefined
        config: FieldConfig.Fields.FieldTypes[N]
    }

    export type EndpointViewers = {
        [E in FieldConfig.Fields.EndpointNames]: React.FC<EndpointViewerProps<E>>
    }

    export module ComponentProps {
        export type DialogSize = "narrow" | "wide"

        export type Dialog = {onOkay?: () => void, onCancel?: () => void, open: boolean, title: string, children: React.ReactNode, width: DialogSize}
        export type DisplayDialog = {open: boolean, title: string, children: React.ReactNode, width: DialogSize}
        export type SimpleCard = {children: React.ReactNode}

        export type AutoComplete = {binding: XBinding.Binding<string>, options: string[], onSearch: () => void}

        export interface TreeNode {
            label: string
            value: string
            children?: TreeNode[]
        }
        export type TreeSelect = {binding: XBinding.Binding<string | undefined>, options: TreeNode[]}
        export type TextInput = {binding: XBinding.Binding<string>}

        export type IconTypes = "add" | "delete" | "close"

        export type RelationList = {children: React.ReactNode[]}
        export type RelationTag = {children: React.ReactNode[], closable: boolean}

        export type Image = {src: string | undefined}
        export type Avatar = {src: string | undefined}
        export type ImageListEditor = {images: string[], onDelete(src: string): void, onAdd(): void}
        export type ImageSelector = {onChange: (files: FileList) => void}
        export type ImageCropper = {src: string, crop: XBinding.Binding<{x: number, y: number, width: number, height: number}>}
        export type ClosableTile = {children: React.ReactNode, onClose: () => void}

        export type SelectableList = {searchElement: React.ReactNode, selectedItemElement: React.ReactNode, itemList: {id: string, element: React.ReactNode}[]}
        export type SelectableListItem = {selected: boolean, onChange: () => void, children: React.ReactNode}

        export type FC<P> = React.FC<WrappedProps<P>>
        export type WrappedProps<P> = P & {style?: React.CSSProperties}
        export type Props = {
            Dialog: Dialog
            DisplayDialog: DisplayDialog
            SimpleCard: SimpleCard
            AutoComplete: AutoComplete
            TreeSelect: TreeSelect
            TextInput: TextInput
            RelationList: RelationList
            RelationTag: RelationTag
            Image: Image
            Avatar: Avatar
            ImageListEditor: ImageListEditor
            ImageCropper: ImageCropper
            ClosableTile: ClosableTile
            SelectableList: SelectableList
            SelectableListItem: SelectableListItem
        }
    }

    export type GlobalComponents = {
        [N in keyof ComponentProps.Props]: ComponentProps.FC<ComponentProps.Props[N]>
    }

    export interface GlobalLayoutProps {
        endpoint: {
            editors: EndpointEditors
            viewers: EndpointViewers
        }
        components: GlobalComponents
    }
}