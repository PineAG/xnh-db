import { XnhDBProtocol } from "@xnh-db/protocol";
import { DbUiConfiguration, Flex, FormItem } from "../rebuild";
import { XnhBase } from "./base";
import { config } from "./config";

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
    
    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(config, "character", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
            <ExtInfo item={props.item}/>
            <Flex direction="vertical">
                <FormItem label="关系">
                    {/* Relations */}
                    <FormItem label="作品">
                        {props.relations.artwork.$element()}
                    </FormItem>
                    <FormItem label="声优">
                        {props.relations.voiceActor.$element()}
                    </FormItem>
                </FormItem>
                {/* Parent */}
                <FormItem label="继承自">
                    {props.$parentElement()}
                </FormItem>
                {/* Children */}
                <FormItem label="扩展至">
                    {props.$childrenElement()}
                </FormItem>
            </Flex>
        </XnhBase.BaseFramework>
    })

    const ExtInfo = DbUiConfiguration.wrapLayout.newPage(config, "character", props => {
        return <Flex direction="vertical">
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
        </Flex>
    })

    export const newPage = DbUiConfiguration.wrapLayout.newPage(config, "character", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
            <ExtInfo item={props.item}/>
        </XnhBase.BaseFramework>
    })

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(config, "character", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>

        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(config, "character", searchResult)
}