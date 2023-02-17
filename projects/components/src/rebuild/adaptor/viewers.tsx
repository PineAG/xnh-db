import { Tag, Empty, Image } from "antd";
import Input from "antd/es/input";
import { GlobalSyncComponents } from "../components/sync";
import { Flex } from "../components/utils";
import { InternalGlobalLayouts } from "../config";
import {AdaptorsConfig as Conf} from "./config"
import {useEffect, useState} from "react"
import Avatar from "antd/es/avatar";
import { UserOutlined } from "@ant-design/icons";
import { AntdWrapperUtils } from "./utils";

export module AntdEndpointViewers {
    export const viewers: InternalGlobalLayouts.EndpointViewers = {
        avatar: (props) => {
            return <AntdWrapperUtils.AsyncAvatar fileName={props.value}/>
        },
        fullText: (props) => {
            return <div>{props.value}</div>
        },
        fullTextList: (props) => {
            return <span>还没做</span>
        },
        gallery: (props) => {
            const [showList, setShowList] = useState(false)

            if(!props.value?.length) {
                return <Empty/>
            }
            return <div>
            <div style={{width: "100%", height: "100%"}} onClick={() => setShowList(true)}>
                <AntdWrapperUtils.AsyncImage
                    fileName={props.value[0]}
                    imageProps={{
                        width: "100%"
                    }}
                />
            </div>
            <div style={{display: "none"}}>
                <Image.PreviewGroup preview={{visible: showList, onVisibleChange: (vis) => setShowList(vis)}}>
                    {props.value.map((f) => (<AntdWrapperUtils.AsyncImage key={f} fileName={f} imageProps={{}}/>))}
                </Image.PreviewGroup>
            </div>
        </div>
        },
        id: (props) => {
            return <></>
        },
        number: (props) => {
            return <div>{props.value}</div>
        },
        tag: (props) => {
            return <Tag>{props.value}</Tag>
        },
        tagList: (props) => {
            return <Flex direction="horizontal">
                {props.value.map(it => <Tag key={it}>{it}</Tag>)}
            </Flex>
        },
    }
}