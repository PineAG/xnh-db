import { XnhDBProtocol } from "@xnh-db/protocol";
import { XnhUiConfiguration } from ".";
import { DbUiConfiguration, Flex, FormItem } from "../rebuild";
import { XnhBase } from "./base";

export module XnhVoiceActor {
    export const VoiceActorTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.IVoiceActor> = {
        $title: "角色",
        ...XnhBase.titles,
    }

    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(XnhUiConfiguration.config, "voiceActor", props => {
        return <Flex direction="vertical">
            <>
            {/* Item Data */}
            <XnhBase.BaseItemWrapper item={props.item}>
                
            </XnhBase.BaseItemWrapper>
            {/* Parent */}
            {props.$parentElement}
            {/* Relations */}
            <FormItem label="角色">
                {props.relations.character.$element()}
            </FormItem>
            <FormItem label="创作者">
                {props.relations.creator.$element()}
            </FormItem>
            </>
        </Flex>
    })

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(XnhUiConfiguration.config, "voiceActor", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>

        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(XnhUiConfiguration.config, "artwork", searchResult)
}