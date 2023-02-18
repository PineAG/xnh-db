import { XnhDBProtocol } from "@xnh-db/protocol";
import { XnhUiConfiguration } from ".";
import { DBSearchWrapper, DbUiConfiguration, Flex, FormItem, HStack } from "../rebuild";
import { XnhBase } from "./base";

export module XnhCharacter {
    export const CharacterTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.ICharacter> = {
        $title: "角色",
        ...XnhBase.titles,
        appearance: {
            $title: "外貌",
            eyes: {
                $title: "眼睛",
                color: "瞳色",
                features: "眼睛特征"
            },
            hair: {
                $title: "头发",
                color: "发色",
                shape: "发型",
                features: "头发特征"
            }
        }
    }
    
    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(XnhUiConfiguration.config, "character", props => {
        return <Flex direction="vertical">
            <>
            {/* Item Data */}
            <XnhBase.BaseItemWrapper item={props.item}>
                <FormItem label={props.item.appearance.$title}>
                    <FormItem label={props.item.appearance.eyes.$title}>
                        <FormItem label={props.item.appearance.eyes.color.$title}>
                            {props.item.appearance.eyes.color.$element}
                        </FormItem>
                        <FormItem label={props.item.appearance.eyes.features.$title}>
                            {props.item.appearance.eyes.features.$element}
                        </FormItem>
                    </FormItem>
                    <FormItem label={props.item.appearance.hair.$title}>
                        <FormItem label={props.item.appearance.hair.color.$title}>
                            {props.item.appearance.hair.color.$element}
                        </FormItem>
                        <FormItem label={props.item.appearance.hair.shape.$title}>
                            {props.item.appearance.hair.shape.$element}
                        </FormItem>
                    </FormItem>
                    </FormItem>
            </XnhBase.BaseItemWrapper>
            {/* Parent */}
            {props.$parentElement}
            {/* Relations */}
            <FormItem label="作品">
                {props.relations.artwork.$element()}
            </FormItem>
            <FormItem label="声优">
                {props.relations.voiceActor.$element()}
            </FormItem>
            </>
        </Flex>
    })

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(XnhUiConfiguration.config, "character", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>

        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(XnhUiConfiguration.config, "character", searchResult)
}