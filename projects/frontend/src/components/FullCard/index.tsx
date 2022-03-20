import { XNHExportedData } from "@xnh-db/types";
import { CharacterCard } from "./CharacterCard";
import {Card} from 'antd';

export interface FullCardProps {
    item: XNHExportedData
}

export function FullCard({item}: FullCardProps) {
    const comp = (
        item.type === 'character' ? <CharacterCard item={item}/> :
        null
    )
    return <Card style={{maxWidth: '1200px', width: '100%'}}>
        {comp}
    </Card>
}
