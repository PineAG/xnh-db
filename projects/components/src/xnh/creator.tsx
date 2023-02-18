import { XnhDBProtocol } from "@xnh-db/protocol";
import { DbUiConfiguration, Flex, FormItem } from "../rebuild";
import { XnhBase } from "./base";
import { config } from "./config";

export module XnhCreator {
    export const CreatorTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.ICreator> = {
        $title: "作品",
        ...XnhBase.titles,
    }

    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(config, "creator", props => {
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

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(config, "creator", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>

        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(config, "creator", searchResult)
}