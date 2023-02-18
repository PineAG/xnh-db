import { FieldConfig } from "@xnh-db/protocol"
import crypto from "crypto"
import "fake-indexeddb/auto"
import { XnhUiConfiguration } from "."
import { DBStorage, DbUiConfiguration } from "../rebuild"

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
        const config = XnhUiConfiguration.config

        const clients = DBStorage.createMemoryStorage(config, "test")
        const id = crypto.randomUUID()
        await clients.local.collections.artwork.updateItem(id, {title: "Megaman EXE"})
        const itemOut = await clients.query.collections.artwork.getItemById(id)
        expect(itemOut.title).toBe("Megaman EXE")
        const fullTextResult = await clients.query.collections.artwork.queryFullText("Mega")
        expect(fullTextResult[0].id).toBe(id)
    })
})
