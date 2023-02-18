import { XnhDBProtocol } from "@xnh-db/protocol";
import React from "react";
import { DbUiConfiguration, Flex, FormItem, HStack } from "../rebuild";

export module XnhBase {
    export const titles: Omit<DbUiConfiguration.TitlesFor<XnhDBProtocol.IBase>, "$title"> = {
        id: "ID",
        title: "标题",
        name: {
            $title: "姓名",
            zhs: "中文名",
            en: "英文名",
            ja: "日文名"
        },
        description: "描述",
        profile: "头像",
        photos: "照片",
    }

    type BaseWrapperProps = {item: DbUiConfiguration.Layouts.ItemLayoutProps<XnhDBProtocol.IBase>, children: React.ReactNode}
    export function BaseItemWrapper(props: BaseWrapperProps) {
        return <HStack layout={["auto", "1fr"]}>
            {props.item.photos.$element}
            <Flex direction="vertical">
                <HStack layout={["auto", "1fr"]}>
                    {props.item.profile.$element}
                    {props.item.title.$element}
                </HStack>
                <FormItem label={props.item.name.$title}>
                    <Flex direction="vertical">
                        <FormItem label={props.item.name.zhs.$title}>
                            {props.item.name.zhs.$element}
                        </FormItem>
                        <FormItem label={props.item.name.en.$title}>
                            {props.item.name.zhs.$element}
                        </FormItem>
                        <FormItem label={props.item.name.ja.$title}>
                            {props.item.name.zhs.$element}
                        </FormItem>
                    </Flex>
                </FormItem>
                {props.children}
            </Flex>
        </HStack>
    }

    type BaseSearchWrapperProps = {item: DbUiConfiguration.Layouts.ItemLayoutProps<XnhDBProtocol.IBase>, children: React.ReactNode}
    export function BaseSearchWrapper(props: BaseSearchWrapperProps) {
        return <HStack layout={["auto", "1fr"]}>
            {props.item.profile.$element}
            <Flex direction="vertical">
                <div>{props.item.title.$element}</div>
                <div>{props.item.name.zhs.$element}</div>
                {props.children}
            </Flex>
        </HStack>
    }
}