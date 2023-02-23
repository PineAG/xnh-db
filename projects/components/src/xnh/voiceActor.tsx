import { XnhDBProtocol } from "@xnh-db/protocol";
import { DbUiConfiguration } from "../rebuild";
import { XnhBase } from "./base";
import { config } from "./config";

export module XnhVoiceActor {
    import XnhFormItem = XnhBase.XnhFormItem

    export const VoiceActorTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.IVoiceActor> = {
        $title: "声优",
        ...XnhBase.titles,
        gender: "性别"
    }

    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(config, "voiceActor", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
            <XnhFormItem label={props.item.gender.$title}>
                {props.item.gender.$element}
            </XnhFormItem>
            <XnhFormItem label="关系">
                {/* Relations */}
                <XnhFormItem label="角色">
                    {props.relations.character.$element()}
                </XnhFormItem>
            </XnhFormItem>
        </XnhBase.BaseFramework>
    })

    export const newPage = DbUiConfiguration.wrapLayout.newPage(config, "voiceActor", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
            <XnhFormItem label={props.item.gender.$title}>
                {props.item.gender.$element}
            </XnhFormItem>
        </XnhBase.BaseFramework>
    })

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(config, "voiceActor", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>
            {props.item.gender.$element}
        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(config, "voiceActor", searchResult)
}