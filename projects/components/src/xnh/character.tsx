import { XnhDBProtocol } from "@xnh-db/protocol";
import { DbUiConfiguration, Flex } from "../rebuild";
import { XnhBase } from "./base";
import { config } from "./config";

export module XnhCharacter {
    import XnhFormItem = XnhBase.XnhFormItem

    export const CharacterTitles: DbUiConfiguration.TitlesFor<XnhDBProtocol.ICharacter> = {
        $title: "角色",
        ...XnhBase.titles,
        gender: "性别",
        appearance: {
            $title: "外貌",
            age: "年龄",
            body: {
                $title: "体型",
                height: "头身比",
                features: "体型特征"
            },
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
            },
            wearing: {
                $title: "着装",
                mainColor: "服装主色",
                detailedColor: "服装辅色",
                cloths: "服装类型",
                attachments: "服装小装饰"
            },
            attachments: "附加部位"
        },
        personality: {
            $title: "性格",
            features: "性格特点"
        },
        voice: {
            $title: "声音",
            age: "声线年龄",
            features: "声线特征"
        }
    }
    
    export const fullPage = DbUiConfiguration.wrapLayout.fullPage(config, "character", props => {
        return <XnhBase.BaseFramework item={props.item}>
            <XnhBase.BaseContent item={props.item}/>
            <ExtInfo item={props.item}/>
            <Flex direction="vertical">
                <XnhFormItem label="关系">
                    {/* Relations */}
                    <XnhFormItem label="作品">
                        {props.relations.artwork.$element()}
                    </XnhFormItem>
                    <XnhFormItem label="声优">
                        {props.relations.voiceActor.$element()}
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
            </Flex>
        </XnhBase.BaseFramework>
    })

    const ExtInfo = DbUiConfiguration.wrapLayout.newPage(config, "character", props => {
        return <Flex direction="vertical">
            <XnhFormItem label={props.item.appearance.$title}>
                <XnhFormItem label={props.item.appearance.age.$title}>
                    {props.item.appearance.age.$element}
                </XnhFormItem>
                <XnhFormItem label={props.item.appearance.body.$title}>
                    <XnhFormItem label={props.item.appearance.body.height.$title}>
                        {props.item.appearance.body.height.$element}
                    </XnhFormItem>
                    <XnhFormItem label={props.item.appearance.body.features.$title}>
                        {props.item.appearance.body.features.$element}
                    </XnhFormItem>
                </XnhFormItem>
                <XnhFormItem label={props.item.appearance.eyes.$title}>
                    <XnhFormItem label={props.item.appearance.eyes.color.$title}>
                        {props.item.appearance.eyes.color.$element}
                    </XnhFormItem>
                    <XnhFormItem label={props.item.appearance.eyes.features.$title}>
                        {props.item.appearance.eyes.features.$element}
                    </XnhFormItem>
                </XnhFormItem>
                <XnhFormItem label={props.item.appearance.hair.$title}>
                    <XnhFormItem label={props.item.appearance.hair.color.$title}>
                        {props.item.appearance.hair.color.$element}
                    </XnhFormItem>
                    <XnhFormItem label={props.item.appearance.hair.shape.$title}>
                        {props.item.appearance.hair.shape.$element}
                    </XnhFormItem>
                </XnhFormItem>
                <XnhFormItem label={props.item.appearance.wearing.$title}>
                    <XnhFormItem label={props.item.appearance.wearing.cloths.$title}>
                        {props.item.appearance.wearing.cloths.$element}
                    </XnhFormItem>
                    <XnhFormItem label={props.item.appearance.wearing.mainColor.$title}>
                        {props.item.appearance.wearing.mainColor.$element}
                    </XnhFormItem>
                    <XnhFormItem label={props.item.appearance.wearing.detailedColor.$title}>
                        {props.item.appearance.wearing.detailedColor.$element}
                    </XnhFormItem>
                    <XnhFormItem label={props.item.appearance.wearing.attachments.$title}>
                        {props.item.appearance.wearing.attachments.$element}
                    </XnhFormItem>
                </XnhFormItem>
                <XnhFormItem label={props.item.appearance.attachments.$title}>
                    {props.item.appearance.attachments.$element}
                </XnhFormItem>
            </XnhFormItem>
            <XnhFormItem label={props.item.voice.$title}>
                <XnhFormItem label={props.item.voice.age.$title}>
                    {props.item.voice.age.$element}
                </XnhFormItem>
                <XnhFormItem label={props.item.voice.features.$title}>
                    {props.item.voice.features.$element}
                </XnhFormItem>
            </XnhFormItem>
            <XnhFormItem label={props.item.gender.$title}>
                {props.item.gender.$element}
            </XnhFormItem>
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