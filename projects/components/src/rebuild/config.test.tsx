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

const CharacterConfig = FieldConfig.makeConfig.for<Character>().as({
    name: F.fullText(1),
    hair: {
        color: F.tagList("color"),
        shape: F.tag("hair.shape")
    }
})

describe("UI Config Test", () => {
    it("happy case", () => {
        const config = DbUiConfiguration.makeConfig.withCollections(b => ({
            character: b.createCollectionOfEntity().withConfig(CharacterConfig).withTitles({
                $title: "Character",
                name: "Name",
                hair: {
                    $title: "Hair",
                    color: "Color",
                    shape: "Shape"
                }
            })
        })).withRelations(b => ({
            inheritance: b.createRelation().ofCollections({
                    parent: "character",
                    child: "character"
                }).withPayload<{}>().withPayloadConfig({}).withPayloadTitles({
                    $title: "Inheritance"
                })
        })).collectionsToRelations({
            character: {
                parents: {
                    title: "Parents",
                    relation: "inheritance",
                    selfKey: "child",
                    targetKey: "parent",
                },
                children: {
                    title: "Children",
                    relation: "inheritance",
                    selfKey: "parent",
                    targetKey: "child",
                }
            }
        }).withLayouts({
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
            }
        })
    })
})