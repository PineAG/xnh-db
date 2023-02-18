import { InternalGlobalLayouts } from "../config";
import {AdaptorsConfig as Conf} from "./config"
import {Input, InputNumber, Button, Tag} from "antd"
import {PlusOutlined} from "@ant-design/icons"
import {useState} from "react"
import { AntdWrapperUtils } from "./utils";
import { AntdUpload } from "./upload";
import { XBinding } from "../components/binding";
import { Flex } from "../components/utils";

export module AntdEndpointEditors {
    export const editors: InternalGlobalLayouts.EndpointEditors = {
        avatar: (props) => {
            const [showUpload, setShowUpload] = useState(false)
            return <>
                <AntdWrapperUtils.AsyncAvatar 
                    fileName={props.binding.value}
                    avatarProps={{
                        onClick: () => setShowUpload(true)
                    }}
                />
                <AntdUpload.ImageUploadDialog
                    open={showUpload}
                    onCancel={() => setShowUpload(false)}
                    onUpload={fileId => props.binding.update(fileId)}
                />
            </>
        },
        fullText: (props) => {
            return <Input.TextArea
                value={props.binding.value}
                onChange={evt => props.binding.update(evt.target.value)}/>
        },
        fullTextList: (props) => {
            return <div>还没做</div>
        },
        gallery: (props) => {
            return <div>还没做</div>
        },
        id: (props) => {
            return <></>
        },
        number: (props) => {
            return <InputNumber
                value={props.binding.value ?? props.config.options.default ?? 0}
                onChange={value => props.binding.update(value ?? undefined)}
                min={props.config.options.min}
                max={props.config.options.max}
                step={props.config.options.step}
            />
        },
        tag: (props) => {
            return <AntdWrapperUtils.TagInput binding={props.binding} tagCollection={props.config.options.collection}/>
        },
        tagList: (props) => {
            const newTagBinding = XBinding.useBinding("")
            const arrayBinding = XBinding.fromArray(XBinding.defaultValue(props.binding, () => []))
            return <Flex direction="vertical" nowrap>
                <Flex direction="horizontal">
                    {arrayBinding.map((item, i) => {
                        return <Tag closable key={i} onClose={evt => {
                            evt.preventDefault()
                            item.remove()
                        }}>{item.value}</Tag>
                    })}
                </Flex>
                <Flex direction="horizontal" nowrap>
                    <AntdWrapperUtils.TagInput binding={newTagBinding} tagCollection={props.config.options.collection}/>
                    <Button 
                        icon={<PlusOutlined/>} type="primary"
                        onClick={() => {
                            if(!newTagBinding.value) {
                                return
                            }
                            props.binding.update([
                                ...(props.binding.value?.filter(it => it !== newTagBinding.value) ?? []),
                                newTagBinding.value
                            ])
                            newTagBinding.update("")
                        }}
                    >
                        添加标签
                    </Button>
                </Flex>
            </Flex>
        },
    }
}