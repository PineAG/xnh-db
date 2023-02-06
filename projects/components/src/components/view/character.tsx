import { ActionButton, Flex, FormItem, HStack, Loading, VStack } from "@pltk/components"
import { CharacterDefinition, ICharacter, IOfflineClientSet, IOnlineClientSet, RelationKeys, RelationPayloads } from "@xnh-db/protocol"
import { Card, Empty, Modal, Tag, Typography } from "antd"
import { useEffect, useState } from "react"
import { DeepPartial } from "utility-types"
import { IdbCollectionQuery } from "../../storage"
import { loadEntityWithInheritance } from "../../sync"
import { Titles } from "../../titles"
import { ILocalSyncOfflineClients, ILocalSyncOnlineClients, LocalSyncConsumer, LocalSyncWrapper, useDBClients, useLocalSyncResult, XBinding } from "../sync"
import { EditorViews } from "./editable"
import { PreviewViews } from "./view"

export function CharacterSearchResultView({id, onOpen}: {id: string, onOpen?: () => void}) {
    const [character, setCharacter] = useState<DeepPartial<ICharacter> | null>(null)
    const clients = useDBClients()

    useEffect(() => {
        loadCharacter()
    }, [id])

    if(character === null) {
        return <Empty/>
    }
    return <Card style={{width: "500px"}} onClick={onOpen}>
        <Card.Meta
            avatar={<PreviewViews.AsyncAvatar filename={character.profile}/>}
            title={character.title}
            description={character.description}
        />
    </Card>

    async function loadCharacter() {
        const data = await loadEntityWithInheritance<ICharacter>(id, CharacterDefinition, clients.query.collections.character, clients.query.inheritance.character)
        setCharacter(data)
    }
}

type Relations = {
    interpersonalLeft: {keys: RelationKeys.Interpersonal, payload: RelationPayloads.Interpersonal}
    interpersonalRight: {keys: RelationKeys.Interpersonal, payload: RelationPayloads.Interpersonal}
    artwork: {keys: RelationKeys.Character_Artwork, payload: RelationPayloads.Character_Artwork}
    voiceActor: {keys: RelationKeys.Character_VoiceActor, payload: RelationPayloads.Character_VoiceActor}
}

function offlineFactory(clients: IOfflineClientSet): ILocalSyncOfflineClients<ICharacter, Relations> {
    return {
        collection: clients.collections.character,
        inheritance: clients.inheritance.character,
        relations: {
            interpersonalLeft: clients.relations.interpersonal,
            interpersonalRight: clients.relations.interpersonal,
            artwork: clients.relations.character_artwork,
            voiceActor: clients.relations.character_voiceActor
        }
    }
}

function onlineFactory(clients: IOnlineClientSet<IdbCollectionQuery>): ILocalSyncOnlineClients<ICharacter, Relations> {
    return {
        collection: clients.collections.character,
        inheritance: clients.inheritance.character,
        relations: {
            interpersonalLeft: {
                selfKey: "left",
                targetKey: "right",
                client: clients.relations.interpersonal
            },
            interpersonalRight: {
                selfKey: "right",
                targetKey: "left",
                client: clients.relations.interpersonal
            },
            artwork: {
                selfKey: "character",
                targetKey: "artwork",
                client: clients.relations.character_artwork
            },
            voiceActor: {
                selfKey: "character",
                targetKey: "voiceActor",
                client: clients.relations.character_voiceActor
            }
        }
    }
}

export function CharacterItemViewer({id}: {id: string}) {
    return <LocalSyncConsumer<ICharacter, Relations> 
        id={id} 
        onlineFactory={onlineFactory} 
        offlineFactory={offlineFactory}>{(result) => {
            const item = result.data.item
            return <>
            <HStack layout={["1fr", "2fr"]} style={{placeItems: "start"}}>
                <PreviewViews.ImageListViewer fileIdList={item.photos ?? []}/>
                <Flex direction="vertical">
                    <HStack layout={["auto", "1fr"]}>
                        <PreviewViews.AsyncAvatar size={64} filename={item.profile ?? null}/>
                        <VStack layout={["1fr", "auto"]}>
                            <Typography.Title style={{margin: 0}}>{item.title}</Typography.Title>
                            <div>
                                {item.name?.zhs ? <Tag>{item.name.zhs}</Tag> : undefined}
                                {item.name?.en ? <Tag>{item.name.en}</Tag> : undefined}
                                {item.name?.ja ? <Tag>{item.name.ja}</Tag> : undefined}
                            </div>
                        </VStack>
                    </HStack>
                    
                </Flex>
            </HStack>
        </>
        }}</LocalSyncConsumer>

}

export function CharacterItemEditor({id, onUpdate}: {id: string, onUpdate: () => void}) {
    return <LocalSyncWrapper
        id={id} 
        onlineFactory={onlineFactory} 
        offlineFactory={offlineFactory}
    >
        <CharacterItemEditorInternal onUpdate={onUpdate}/>
    </LocalSyncWrapper>
}

function CharacterItemEditorInternal({onUpdate}: {onUpdate: () => void}) {
    const result = useLocalSyncResult<ICharacter, Relations>()
    const binding = XBinding.useBinding(result.data)

    return <Flex direction="vertical">
        <ActionButton onClick={saveData}>保存</ActionButton>
        <CharacterBindingEditor binding={XBinding.propertyOf(binding).join("item")}/>
    </Flex>

    async function saveData() {
        if(result.mode !== "online") return;
        await result.update({
            item: binding.value.item,
            parentId: binding.value.parent?.id,
            relations: binding.value.relations
        })
        onUpdate()
    }
}

export function CharacterBindingEditor({binding}: {binding: XBinding.Binding<DeepPartial<ICharacter>>}) {
    return <HStack layout={["auto", "1fr"]}>
        <EditorViews.ImageListEditor
            binding={XBinding.propertyOf(binding).join("photos")}
            config={CharacterDefinition.photos}
        />
        <Flex direction="vertical">    
            <EditorViews.AvatarEditor
                binding={XBinding.propertyOf(binding).join("profile")}
                config={CharacterDefinition.profile}
            />
        </Flex>
    </HStack>
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
