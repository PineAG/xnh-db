import { FieldConfig } from "@xnh-db/protocol";
import { XBinding } from "../components/binding";

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
        export type IconButton = {}

        export type FC<P> = React.FC<P & {style?: React.CSSProperties}>
    }

    export type GlobalComponents = {
        Dialog: ComponentProps.FC<ComponentProps.Dialog>
        DisplayDialog: ComponentProps.FC<ComponentProps.DisplayDialog>
        SimpleCard: ComponentProps.FC<ComponentProps.SimpleCard>
        AutoComplete: ComponentProps.FC<ComponentProps.AutoComplete>
        TreeSelect: ComponentProps.FC<ComponentProps.TreeSelect>
        TextInput: ComponentProps.FC<ComponentProps.TextInput>
    }

    export interface GlobalLayoutProps {
        endpoint: {
            editors: EndpointEditors
            viewers: EndpointViewers
        }
        components: GlobalComponents
    }

}