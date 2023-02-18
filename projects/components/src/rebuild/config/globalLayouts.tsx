import { FieldConfig } from "@xnh-db/protocol";
import { XBinding } from "../components/binding";
import {useCallback} from "react"
import { DbContexts } from "../components/context";
import { DBSearch } from "../data";

export module InternalGlobalLayouts {
    export type EndpointEditorProps<N extends FieldConfig.Fields.EndpointNames> = {
        binding: XBinding.Binding<FieldConfig.Fields.ValueType<N> | undefined>
        config: FieldConfig.Fields.FieldTypes[N]
        parentValue: FieldConfig.Fields.ValueType<N> | undefined
        openItem: (id: string) => void
        openSearch: (query: DBSearch.IQuery) => void
        propertyPath: string[]
    }
    export type EndpointEditors = {
        [E in FieldConfig.Fields.EndpointNames]: React.FC<EndpointEditorProps<E>>
    }
    
    export type EndpointViewerProps<N extends FieldConfig.Fields.EndpointNames> = {
        value: FieldConfig.Fields.ValueType<N> | undefined
        config: FieldConfig.Fields.FieldTypes[N]
        propertyPath: string[]
        openItem: (id: string) => void
        openSearch: (query: DBSearch.IQuery) => void
    }

    export type EndpointViewers = {
        [E in FieldConfig.Fields.EndpointNames]: React.FC<EndpointViewerProps<E>>
    }

    export module ComponentProps {
        export type DialogSize = "small" | "large" | "middle"

        export type Dialog = {onOkay?: () => void, onCancel?: () => void, open: boolean, title: string, children: React.ReactNode, width: DialogSize}
        export type DisplayDialog = {open: boolean, title: string, children: React.ReactNode, width: DialogSize}
        export type SimpleCard = {children: React.ReactNode}

        export type AutoComplete = {value: string, onChange: (value: string) => void, options: string[], onSearch: () => void}
        export interface SelectItem {
            label: string
            value: string
        }
        export interface TreeNode {
            label: string
            value: string
            children?: TreeNode[]
        }
        export type TreeSelect = {value: string, onChange: (value: string) => void, options: TreeNode[]}
        export type Select = {value: string, onChange: (value: string) => void, options: SelectItem[], disabled?: boolean}
        export type TextInput = {value: string, onChange: (value: string) => void, disabled?: boolean}

        export type IconTypes = "add" | "delete" | "close"

        export type RelationList = {children: React.ReactNode}
        export type RelationTag = {children: React.ReactNode, onClose?: () => void, onClick: () => void}
        export type SearchQueryTag = {children: React.ReactNode, onClose: () => void}

        export type Image = {src: string | undefined}
        export type Avatar = {src: string | undefined}
        export type Button = {type: "default" | "primary", onClick: () => void, icon?: IconTypes, children?: React.ReactNode, disabled?: boolean}
        export type AddRelationButton = {onClick: () => void}
        export type ImageListEditor = {images: string[], onDelete(src: string): void, onAdd(): void}
        export type ImageSelector = {onChange: (files: FileList) => void}
        export type ImageCropper = {src: string, crop: XBinding.Binding<{x: number, y: number, width: number, height: number}>}
        export type ClosableTile = {children: React.ReactNode, onClose: () => void}

        export type SelectableList = {searchElement: React.ReactNode, selectedItemElement: React.ReactNode, itemList: {id: string, element: React.ReactNode}[]}
        export type SelectableListItem = {selected: boolean, onChange: () => void, children: React.ReactNode}

        export type Empty = {simple?: boolean}
        export type Card = {children: React.ReactNode, onClick?: () => void}
        export type Loading = {}
        export type Divider = {}

        export type QuickConfirm = {title: string, description?: string, onConfirm: () => void, children: React.ReactNode}

        export type ItemPreviewWrapper = {children: React.ReactNode, onClick?: () => void}

        export type Steps = {current: number, steps: {title: string}[]}

        export type FC<P> = React.FC<WrappedProps<P>>
        export type WrappedProps<P> = P & Pick<React.HTMLProps<HTMLElement>, "style">
        export type Props = {
            Dialog: Dialog
            Empty: Empty
            Loading: Loading
            Divider: Divider
            AddRelationButton: AddRelationButton
            DisplayDialog: DisplayDialog
            Card: Card
            AutoComplete: AutoComplete
            QuickConfirm: QuickConfirm
            TreeSelect: TreeSelect
            TextInput: TextInput
            RelationList: RelationList
            RelationTag: RelationTag
            SearchQueryTag: SearchQueryTag
            ItemPreviewWrapper: ItemPreviewWrapper
            Steps: Steps
            Button: Button
            Select: Select
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