import { XnhDBProtocol } from "@xnh-db/protocol";
import { DbUiConfiguration, Flex, FormItem } from "../rebuild";
import { XnhBase } from "./base";
import { config } from "./config";

export module XnhVoiceActor {
    export const VoiceActorTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.IVoiceActor> = {
        $title: "声优",
        ...XnhBase.titles,
        gender: "性别"
    }

    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(config, "voiceActor", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
            <FormItem label={props.item.gender.$title}>
                {props.item.gender.$element}
            </FormItem>
            <FormItem label="关系">
                {/* Relations */}
                <FormItem label="角色">
                    {props.relations.character.$element()}
                </FormItem>
                <FormItem label="创作者">
                    {props.relations.creator.$element()}
                </FormItem>
            </FormItem>
        </XnhBase.BaseFramework>
    })

    export const newPage = DbUiConfiguration.wrapLayout.newPage(config, "voiceActor", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
            <FormItem label={props.item.gender.$title}>
                {props.item.gender.$element}
            </FormItem>
        </XnhBase.BaseFramework>
    })

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(config, "voiceActor", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>
            {props.item.gender.$element}
        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(config, "voiceActor", searchResult)
}