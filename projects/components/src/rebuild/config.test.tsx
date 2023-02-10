import React from "react"
import { FieldConfig } from "@xnh-db/protocol"
import {DbUiConfiguration} from "./config"

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
    it("happy case", () => {
        const config = DbUiConfiguration.makeConfig.withCollections(b => ({
            character: b.createCollectionOfEntity<Character>(true).withConfig(CharacterConfig).withTitles({
                $title: "Character",
                name: "Name",
                hair: {
                    $title: "Hair",
                    color: "Color",
                    shape: "Shape"
                }
            }),
            artwork: b.createCollectionOfEntity<Artwork>().withConfig(ArtworkConfig).withTitles({
                $title: "Artwork",
                name: "Name",
            })
        })).withRelations(b => ({
            inheritance: b.createRelation().ofCollections({
                    parent: "character",
                    child: "character"
                }).withPayload<{}>().withPayloadConfig({}).withPayloadTitles({
                    $title: "Inheritance"
                }),
            artwork_character: b.createRelation().ofCollections({
                artwork: "artwork",
                character: "character"
            }).withPayload<{}>().withPayloadConfig({}).withPayloadTitles({$title: "WTF"})
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

        const layouts = DbUiConfiguration.makeLayouts(config, {
            character: {
                fullPage: (props) => (<div>
                    <h1>{props.item.$title}</h1>
                    <p>{props.item.name.$element}</p>
                    <p>{props.relations.parents.$richListElement}</p>
                </div>),
                relationPreview: {
                    rich: (props) => (<div>{props.item.$title}={props.item.name.$element}</div>),
                    simple: (props) => <span>{props.item.name.$element}</span>
                },
                searchResult: (props) => <span>{props.item.name.$element}</span>
            },
            artwork: {
                fullPage: (props) => (<div>
                    <h1>{props.item.$title}</h1>
                    <p>{props.item.name.$element}</p>
                    <p>{props.relations.parents.$richListElement}</p>
                </div>),
                relationPreview: {
                    rich: (props) => (<div>{props.item.$title}={props.item.name.$element}</div>),
                    simple: (props) => <span>{props.item.name.$element}</span>
                },
                searchResult: (props) => <span>{props.item.name.$element}</span>
            }
        })

        const CharacterFullPage = DbUiConfiguration.wrapLayout.fullPage(config, "character", props => {
            return <div>
                <h1>{props.item.$title}</h1>
                <p>{props.item.name.$element}</p>
                <p>{props.relations.children.$richListElement}</p>
            </div>
        })


    })
})
