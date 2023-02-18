import * as Antd from "antd"
import * as AntdIcons from "@ant-design/icons"
import { InternalGlobalLayouts } from "../config";
import { Flex } from "../components/utils";

export module AntdGlobalComponents {
    export const components: InternalGlobalLayouts.GlobalComponents = {
        Dialog: (props) => {
            return <Antd.Modal
                title={props.title}
                style={props.style}
                open={props.open}
                width={DialogWidth[props.width]}
                onOk={props.onOkay}
                onCancel={props.onCancel}
            >
                {props.children}
            </Antd.Modal>
        },
        Empty: (props) => {
            let icon = props.simple ? Antd.Empty.PRESENTED_IMAGE_SIMPLE: Antd.Empty.PRESENTED_IMAGE_DEFAULT
            return <Antd.Empty image={icon}/>
        },
        Loading: (props) => {
            return <div style={{display: "grid", placeItems: "center", ...props.style}}>
                <Antd.Spin indicator={
                    <AntdIcons.LoadingOutlined spin style={{ fontSize: 24 }}/>
                }/>
            </div>
        },
        Divider: (props) => {
            return <Antd.Divider style={props.style}/>
        },
        AddRelationButton: (props) => {
            return <Antd.Button icon={<AntdIcons.PlusOutlined/>} onClick={props.onClick} style={props.style}/>
        },
        DisplayDialog: (props) => {
            return <Antd.Modal
                title={props.title}
                style={props.style}
                open={props.open}
                width={DialogWidth[props.width]}
                okButtonProps={{style: {display: "none"}}}
                cancelButtonProps={{style: {display: "none"}}}
            >
                {props.children}
            </Antd.Modal>
        },
        Card: (props) => {
            return <Antd.Card
                onClick={props.onClick}
            >{props.children}</Antd.Card>
        },
        AutoComplete: (props) => {
            return <Antd.AutoComplete
                value={props.value}
                onChange={props.onChange}
                onSearch={props.onSearch}
                options={props.options.map(it => ({label: it, value: it}))}
                style={props.style}
            />
        },
        QuickConfirm: (props) => {
            return <Antd.Popconfirm title={props.title} description={props.description} onConfirm={props.onConfirm}>
                {props.children}
            </Antd.Popconfirm>
        },
        TreeSelect: (props) => {
            return <Antd.TreeSelect
                value={props.value}
                onChange={props.onChange}
                treeData={props.options}
                style={props.style}
            />
        },
        RelationList: (props) => {
            return <Flex direction="horizontal" style={props.style}>{props.children}</Flex>
        },
        RelationTag: (props) => {
            const closable = !!props.onClose
            return <Antd.Tag
                onClick={props.onClick}
                closable={closable} 
                onClose={props.onClose}
                style={props.style}
                >{props.children}</Antd.Tag>
        },
        SearchQueryTag: (props) => {
            const closable = !!props.onClose
            return <Antd.Tag
                closable={closable} 
                onClose={props.onClose}
                style={props.style}
                >{props.children}</Antd.Tag>
        },
        ItemPreviewWrapper: (props) => {
            return <Antd.Card style={props.style}>{props.children}</Antd.Card>
        },
        Steps: (props) => {
            return <Antd.Steps
                current={props.current}
                items={props.steps}
                style={props.style}
            />
        },
        Button: (props) => {
            return <Antd.Button
                icon={props.icon ? Icons[props.icon] : undefined}
                type={props.type}
                onClick={props.onClick}
                disabled={props.disabled}
                style={props.style}
            >{props.children}</Antd.Button>
        },
        Select: (props) => {
            return <Antd.Select
                value={props.value}
                onChange={props.onChange}
                options={props.options}
                style={props.style}
                disabled={props.disabled}
            />
        },
        TextInput: (props) => {
            return <Antd.Input 
                value={props.value}
                onChange={evt => props.onChange(evt.target.value)}
                disabled={props.disabled}
            />
        },
    }

    const Icons: Record<InternalGlobalLayouts.ComponentProps.IconTypes, JSX.Element> = {
        "add": <AntdIcons.PlusOutlined/>,
        "close": <AntdIcons.CloseOutlined/>,
        "delete": <AntdIcons.DeleteOutlined/>,
    }
    const DialogWidth: Record<InternalGlobalLayouts.ComponentProps.DialogSize, string> = {
        "large": "90%",
        "middle": "70%",
        "small": "50%"
    }
}