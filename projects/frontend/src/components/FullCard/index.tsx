import { XNHExportedData } from "@xnh-db/types";
import { ArtworkCard } from "./ArtworkCard";
import { CharacterCard } from "./CharacterCard";
import { CreatorCard } from "./CreatorCard";
import { CardComponent } from "./utils";
import { VoiceActorCard } from "./VoiceActorCard";

export interface FullCardProps {
    item: XNHExportedData
}

export function FullCard({item}: FullCardProps) {
    const comp = (
        item.type === 'character' ? <CharacterCard item={item}/> :
        null
    )
    return comp
}
