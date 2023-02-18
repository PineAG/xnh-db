import { XnhDBProtocol } from "@xnh-db/protocol";
import { XnhUiConfiguration } from ".";
import { DbUiConfiguration, Flex, FormItem, HStack } from "../rebuild";
import { XnhBase } from "./base";

export module XnhArtwork {
    export const ArtworkTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.IArtwork> = {
        $title: "作品",
        ...XnhBase.titles,
    }

    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(XnhUiConfiguration.config, "artwork", props => {
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

    export const searchResult = DbUiConfiguration.wrapLayout.searchResult(XnhUiConfiguration.config, "artwork", props => {
        return <XnhBase.BaseSearchWrapper item={props.item}>

        </XnhBase.BaseSearchWrapper>
    })

    export const previewItem = DbUiConfiguration.wrapLayout.previewItem(XnhUiConfiguration.config, "artwork", searchResult)
}