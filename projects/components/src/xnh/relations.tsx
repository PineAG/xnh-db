import { XnhDBProtocol as P } from "@xnh-db/protocol";
import { DbUiConfiguration, HStack } from "../rebuild";
import { config } from "./config";
import { XnhBase } from "./base";

import RP = P.RelationPayloads
import XnhFormItem = XnhBase.XnhFormItem

export module XnhInterpersonal {
    export const titles: DbUiConfiguration.TitlesFor<RP.Interpersonal> = {
        $title: "人际关系",
        leftRelation: "关系(左)",
        rightRelation: "关系(右)"
    }

    export const payloadPreview = DbUiConfiguration.wrapLayout.payloadPreview(config, "interpersonal", props => {
        if(props.selfKey === "left") {
            return <>{props.collections.right.title.$element}</>
        } else {
            return <>{props.collections.left.title.$element}</>
        }
    })

    export const payloadEditor = DbUiConfiguration.wrapLayout.payloadEditor(config, "interpersonal", props => {
        return <HStack layout={["1fr", "1fr"]}>
            <XnhFormItem label={props.payload.leftRelation.$title}>
                {props.payload.leftRelation.$element}
            </XnhFormItem>
            <XnhFormItem label={props.payload.rightRelation.$title}>
                {props.payload.rightRelation.$element}
            </XnhFormItem>
        </HStack>
    })
}

export module XnhCharacter_Artwork {
    export const titles: DbUiConfiguration.TitlesFor<RP.Character_Artwork> = {
        $title: "角色所属作品",
        characterType: "角色类型"
    }

    export const payloadPreview = DbUiConfiguration.wrapLayout.payloadPreview(config, "character_artwork", props => {
        if(props.selfKey === "character") {
            return <>{props.collections.artwork.title.$element}</>
        } else {
            return <>{props.collections.character.title.$element}</>
        }
    })

    export const payloadEditor = DbUiConfiguration.wrapLayout.payloadEditor(config, "character_artwork", props => {
        return <HStack layout={["1fr", "1fr"]}>
            <XnhFormItem label={props.payload.characterType.$title}>
                {props.payload.characterType.$element}
            </XnhFormItem>
        </HStack>
    })
}

export module XnhArtwork_Creator {
    export const titles: DbUiConfiguration.TitlesFor<RP.Artwork_Creator> = {
        $title: "作品制作人员",
        creatorType: "职位"
    }

    export const payloadPreview = DbUiConfiguration.wrapLayout.payloadPreview(config, "artwork_creator", props => {
        if(props.selfKey === "artwork") {
            return <>{props.collections.creator.title.$element}</>
        } else {
            return <>{props.collections.artwork.title.$element}</>
        }
    })

    export const payloadEditor = DbUiConfiguration.wrapLayout.payloadEditor(config, "artwork_creator", props => {
        return <HStack layout={["1fr", "1fr"]}>
            <XnhFormItem label={props.payload.creatorType.$title}>
                {props.payload.creatorType.$element}
            </XnhFormItem>
        </HStack>
    })
}

export module XnhCharacter_VoiceActor {
    export const titles: DbUiConfiguration.TitlesFor<RP.Character_VoiceActor> = {
        $title: "角色声优",
        voiceType: "声线类型"
    }

    export const payloadPreview = DbUiConfiguration.wrapLayout.payloadPreview(config, "character_voiceActor", props => {
        if(props.selfKey === "voiceActor") {
            return <>{props.collections.character.title.$element}</>
        } else {
            return <>{props.collections.voiceActor.title.$element}</>
        }
    })

    export const payloadEditor = DbUiConfiguration.wrapLayout.payloadEditor(config, "character_voiceActor", props => {
        return <HStack layout={["1fr", "1fr"]}>
            <XnhFormItem label={props.payload.voiceType.$title}>
                {props.payload.voiceType.$element}
            </XnhFormItem>
        </HStack>
    })
}
