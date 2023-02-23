import { XnhDBProtocol } from "@xnh-db/protocol";
import { DbUiConfiguration } from "../rebuild";
import { XnhBase } from "./base";
import { config } from "./config";

export module XnhArtwork {
    import XnhFormItem = XnhBase.XnhFormItem
    
    export const ArtworkTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.IArtwork> = {
        $title: "作品",
        ...XnhBase.titles,
    }

    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(config, "artwork", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
            <XnhFormItem label="关系">
                {/* Relations */}
                <XnhFormItem label="角色">
                    {props.relations.character.$element()}
                </XnhFormItem>
                <XnhFormItem label="创作者">
                    {props.relations.creator.$element()}
                </XnhFormItem>
            </XnhFormItem>
            {/* Parent */}
            <XnhFormItem label="继承自">
                {props.$parentElement()}
            </XnhFormItem>
            {/* Children */}
            <XnhFormItem label="扩展至">
                {props.$childrenElement()}
            </XnhFormItem>
        </XnhBase.BaseFramework>
    })

    export const newPage = DbUiConfiguration.wrapLayout.newPage(config, "artwork", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
        </XnhBase.BaseFramework>
    })

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(config, "artwork", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>

        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(config, "artwork", searchResult)
}