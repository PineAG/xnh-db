import { XnhDBProtocol } from "@xnh-db/protocol";
import { DbUiConfiguration, Flex, FormItem } from "../rebuild";
import { XnhBase } from "./base";
import { config } from "./config";

export module XnhCharacter {
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
                <FormItem label={props.item.appearance.age.$title}>
                    {props.item.appearance.age.$element}
                </FormItem>
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
                <FormItem label={props.item.appearance.wearing.$title}>
                    <FormItem label={props.item.appearance.wearing.cloths.$title}>
                        {props.item.appearance.wearing.cloths.$element}
                    </FormItem>
                    <FormItem label={props.item.appearance.wearing.mainColor.$title}>
                        {props.item.appearance.wearing.mainColor.$element}
                    </FormItem>
                    <FormItem label={props.item.appearance.wearing.detailedColor.$title}>
                        {props.item.appearance.wearing.detailedColor.$element}
                    </FormItem>
                    <FormItem label={props.item.appearance.wearing.attachments.$title}>
                        {props.item.appearance.wearing.attachments.$element}
                    </FormItem>
                </FormItem>
                <FormItem label={props.item.appearance.attachments.$title}>
                    {props.item.appearance.attachments.$element}
                </FormItem>
            </FormItem>
            <FormItem label={props.item.voice.$title}>
                <FormItem label={props.item.voice.age.$title}>
                    {props.item.voice.age.$element}
                </FormItem>
                <FormItem label={props.item.voice.features.$title}>
                    {props.item.voice.features.$element}
                </FormItem>
            </FormItem>
            <FormItem label={props.item.gender.$title}>
                {props.item.gender.$element}
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