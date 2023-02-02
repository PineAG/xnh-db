import { CharacterDefinition, ICharacter } from "@xnh-db/protocol"
import {Avatar, Card, Empty} from "antd"
import { useEffect, useState } from "react"
import { DeepPartial } from "utility-types"
import { loadEntityWithInheritance } from "../../sync"
import { useDBClients } from "../sync"
import { AsyncAvatar } from "./image"

export function CharacterSearchResultView({id}: {id: string}) {
    const [character, setCharacter] = useState<DeepPartial<ICharacter> | null>(null)
    const clients = useDBClients()

    useEffect(() => {
        loadCharacter()
    }, [id])

    if(character === null) {
        return <Empty/>
    }
    return <Card>
        <Card.Meta
            avatar={<AsyncAvatar filename={character.profile}/>}
            title={character.title}
            description={character.description}
        />
    </Card>

    async function loadCharacter() {
        const data = await loadEntityWithInheritance<ICharacter>(id, CharacterDefinition, clients.query.collections.character, clients.query.inheritance.character)
        setCharacter(data)
    }
}