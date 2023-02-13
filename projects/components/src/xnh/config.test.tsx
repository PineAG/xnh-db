import React from "react"
import "fake-indexeddb/auto"
import { FieldConfig } from "@xnh-db/protocol"
import crypto from "crypto"
import {DbUiConfiguration, DBSearch, DBStorage} from "../rebuild"

import F = FieldConfig.Fields

type Character = FieldConfig.AsEntity<{
    name: string
    hair: {
        color: string[]
        shape: string
    }
}>

type Artwork = FieldConfig.AsEntity<{
    name: string
}>

const CharacterTitles: DbUiConfiguration.TitlesFor<Character> = {
    $title: "Character",
    name: "Name",
    hair: {
        $title: "Hair",
        color: "Color",
        shape: "Shape"
    }
}

const ArtworkTitles: DbUiConfiguration.TitlesFor<Artwork> = {
    $title: "Artwork",
    name: "Name",
}

const CharacterConfig = FieldConfig.makeConfig.for<Character>().as({
    name: F.fullText(1),
    hair: {
        color: F.tagList("color"),
        shape: F.tag("hair.shape")
    }
})

const ArtworkConfig = FieldConfig.makeConfig.for<Artwork>().as({
    name: F.fullText(1)
})

describe("UI Config Test", () => {
    it("happy case", async () => {
        const config = DbUiConfiguration.makeConfig.withCollections(b => ({
            character: b.createCollectionOfEntity<Character>(true).withConfig(CharacterConfig),
            artwork: b.createCollectionOfEntity<Artwork>().withConfig(ArtworkConfig)
        })).withRelations(b => ({
            inheritance: b.createRelation().ofCollections({
                    parent: "character",
                    child: "character"
                }).withPayload<{}>().withPayloadConfig({}),
            artwork_character: b.createRelation().ofCollections({
                artwork: "artwork",
                character: "character"
            }).withPayload<{}>().withPayloadConfig({})
        })).collectionsToRelations({
            character: b => ({
                parents: b.toRelation("inheritance", {selfKey: "child", targetKey: "parent"}),
                children: b.toRelation("inheritance", {selfKey: "parent", targetKey: "child"})
            }),
            artwork: b => ({
                characters: b.toRelation("artwork_character", {selfKey: "artwork", targetKey: "character"})
            })
        }).done()

        type Props = typeof config

        const CharacterFullPage = DbUiConfiguration.wrapLayout.fullPage(config, "character", props => {
            return <div>
                <h1>{props.item.$title}</h1>
                <p>{props.item.name.$element}</p>
                <p>{props.relations.children.$element()}</p>
            </div>
        })

        const CharacterSimple = DbUiConfiguration.wrapLayout.relation(config, "character", props => {
            return <div>
                <h1>{props.item.$title}</h1>
                <p>{props.item.name.$element}</p>
            </div>
        })

        const layouts = DbUiConfiguration.makeDisplayProps(config, {
            titles: {
                entityTitles: {
                    character: CharacterTitles,
                    artwork: ArtworkTitles
                },
                payloadTitles: {
                    inheritance: {$title: "Inheritance"},
                    artwork_character: {
                        $title: "Artwork-Character"
                    }
                }
            },
            layouts: {
                entities: {
                    character: {
                        fullPage: CharacterFullPage,
                        previewItem: CharacterSimple,
                        previewPage: CharacterSimple,
                        searchResult: CharacterSimple
                    },
                    artwork: {
                        fullPage: (props) => (<div>
                            <h1>{props.item.$title}</h1>
                            <p>{props.item.name.$element}</p>
                            <p>{props.relations.parents.$element()}</p>
                        </div>),
                        previewItem: (props) => (<div>{props.item.$title}={props.item.name.$element}</div>),
                        previewPage: (props) => (<div>{props.item.$title}={props.item.name.$element}</div>),
                        searchResult: (props) => <span>{props.item.name.$element}</span>
                    }
                },
                payloads: {
                    inheritance: {
                        payloadEditor: (props) => <></>,
                        relationPreview: (props) => <></>
                    },
                    artwork_character: {
                        payloadEditor: (props) => <></>,
                        relationPreview: (props) => <></>
                    }
                }
            },
            global: {}
        })

        const clients = DBStorage.createMemoryStorage(config, "test")
        const id = crypto.randomUUID()
        await clients.local.collections.artwork.updateItem(id, {name: "Megaman EXE"})
        const itemOut = await clients.query.collections.artwork.getItemById(id)
        expect(itemOut.name).toBe("Megaman EXE")
        const fullTextResult = await clients.query.collections.artwork.queryFullText("Mega")
        expect(fullTextResult[0].id).toBe(id)
    })
})
