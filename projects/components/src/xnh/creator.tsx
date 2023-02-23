import { XnhDBProtocol } from "@xnh-db/protocol";
import { DbUiConfiguration} from "../rebuild";
import { XnhBase } from "./base";
import { config } from "./config";

export module XnhCreator {
    import XnhFormItem = XnhBase.XnhFormItem
    export const CreatorTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.ICreator> = {
        $title: "创作者",
        ...XnhBase.titles
    }

    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(config, "creator", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
            <XnhFormItem label="关系">
                {/* Relations */}
                <XnhFormItem label="作品">
                    {props.relations.artwork.$element()}
                </XnhFormItem>
            </XnhFormItem>
        </XnhBase.BaseFramework>
    })

    export const newPage = DbUiConfiguration.wrapLayout.newPage(config, "creator", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
        </XnhBase.BaseFramework>
    })

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(config, "creator", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>

        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(config, "creator", searchResult)
}