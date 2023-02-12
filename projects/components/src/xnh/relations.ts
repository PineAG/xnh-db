import { XnhDBProtocol as P } from "@xnh-db/protocol";
import { DbUiConfiguration } from "../rebuild";

export module XnhRelationsLayouts {
    import RP = P.RelationPayloads
    export const Interpersonal: DbUiConfiguration.TitlesFor<RP.Interpersonal> = {
        $title: "人际关系",
        relation: "关系"
    }
    export const Character_Artwork: DbUiConfiguration.TitlesFor<RP.Character_Artwork> = {
        $title: "角色所属作品",
        characterType: "角色类型"
    }
    export const Artwork_Creator: DbUiConfiguration.TitlesFor<RP.Artwork_Creator> = {
        $title: "作品制作人员",
        creatorType: "职位"
    }
    export const Character_VoiceActor: DbUiConfiguration.TitlesFor<RP.Character_VoiceActor> = {
        $title: "角色声优",
        voiceType: "声线类型"
    }
}