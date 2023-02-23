import { XnhDBProtocol } from "@xnh-db/protocol";
import { DbUiConfiguration, Flex, FormItem } from "../rebuild";
import { XnhBase } from "./base";
import { config } from "./config";

export module XnhVoiceActor {
    export const VoiceActorTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.IVoiceActor> = {
        $title: "声优",
        ...XnhBase.titles,
    }

    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(config, "voiceActor", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
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
        </XnhBase.BaseFramework>
    })

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(config, "voiceActor", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>

        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(config, "artwork", searchResult)
}