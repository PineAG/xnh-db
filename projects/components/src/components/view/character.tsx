import { Loading } from "@pltk/components"
import { CharacterDefinition, ICharacter, RelationKeys, RelationPayloads } from "@xnh-db/protocol"
import {Avatar, Card, Empty, Modal} from "antd"
import { useEffect, useState } from "react"
import { DeepPartial } from "utility-types"
import { loadEntityWithInheritance } from "../../sync"
import { Titles } from "../../titles"
import { useSearchItemOpener } from "../search"
import { CreateLocalSyncRelations, ILocalSyncOnlineClients, useDBClients, useLocalSyncResult, XBinding } from "../sync"
import { EditorViews } from "./editable"
import { AsyncAvatar } from "./image"
import {LocalSyncWrapper} from "../sync"

export function CharacterSearchResultView({id}: {id: string}) {
    const [character, setCharacter] = useState<DeepPartial<ICharacter> | null>(null)
    const clients = useDBClients()
    const openDialog = XBinding.useBinding(false)
    const itemOpener = useSearchItemOpener()

    useEffect(() => {
        loadCharacter()
    }, [id])

    if(character === null) {
        return <Empty/>
    }
    return <Card onClick={onClick} style={{width: "500px"}}>
        <Card.Meta
            avatar={<AsyncAvatar filename={character.profile}/>}
            title={character.title}
            description={character.description}
        />
        <CharacterEditorDialog id={id} open={openDialog}/>
    </Card>

    async function loadCharacter() {
        const data = await loadEntityWithInheritance<ICharacter>(id, CharacterDefinition, clients.query.collections.character, clients.query.inheritance.character)
        setCharacter(data)
    }

    function onClick() {
        openDialog.update(true)
        if(itemOpener) {
            itemOpener("character", id)
        }
    }
}

export function CharacterItemEditor({binding}: {binding: XBinding.Binding<DeepPartial<ICharacter>>}) {
    return <>
        <EditorViews.AvatarEditor
            title={Titles.Character.profile}
            binding={XBinding.propertyOf(binding).join("profile")}
            config={CharacterDefinition.profile}
        />
    </>
}

interface CharacterEditorDialogProps {
    id: string
    open: XBinding.Binding<boolean>
}

export function CharacterEditorDialog(props: CharacterEditorDialogProps) {
    return <CharacterEditorDialogInternal {...props}/>
    // return <LocalSyncWrapper id={}>
    //     <CharacterEditorDialogInternal {...props}/>
    // </LocalSyncWrapper>
}

function CharacterEditorDialogInternal(props: CharacterEditorDialogProps) {
    const clients = useDBClients()
    const binding = XBinding.useBinding<DeepPartial<ICharacter> | null>(null)

    const properties = XBinding.propertyOf(binding)

    useEffect(() => {
        initialize()
    }, [props.id, props.open.value])

    const body = binding.value !== null ? (
        <EditorViews.AvatarEditor
            title={Titles.Character.profile}
            config={CharacterDefinition.profile}
            binding={properties.join("profile")}
        />
    ) : (<Loading/>)

    return <Modal title="编辑 人物信息" open={props.open.value} onCancel={onCancel} onOk={onOk}>
        {body}
    </Modal>

    function onCancel() {
        props.open.update(false)
    }

    async function onOk() {
        if(binding.value === null) {
            return
        }
        await clients.query.collections.character.putItem(props.id, binding.value)
        props.open.update(false)
    }

    async function initialize() {
        if(!props.open.value) return
        const data = await clients.query.collections.character.getItemById(props.id)
        binding.update(data)
    }
}
