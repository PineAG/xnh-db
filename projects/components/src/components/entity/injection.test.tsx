import {describe, test, expect} from "@jest/globals"
import {EntityPropertyInjection} from "./injection"
import { DBConfig } from "@xnh-db/common"
import { StagingStore } from "@xnh-db/core"

const config = DBConfig.create(b => ({
    a: {
        b: b.tagList({tagCollection: "default"})
    }
}))

type Conf = typeof config

const titles: EntityPropertyInjection.EntityTitles<Conf> = {
    a: {
        $section: "Section A",
        b: "B"
    }
}

describe("injection-tests", () => {
    test("simple", () => {
        const entity: DBConfig.PartialEntity<Conf> = {
            a: {
                b: ["a", "b"]
            }
        }

        const bindings = StagingStore.convertEndpoints(config, entity)
        const endpoints = EntityPropertyInjection.getEndpoints(config, {titles, bindings})
        expect(endpoints.a.$section.title).toBe("Section A")
        expect(endpoints.a.b.title).toBe("B")
        expect(endpoints.a.b.binding.value).toStrictEqual(["a", "b"])
        endpoints.a.b.binding.update(["233"])
        expect(entity.a?.b).toStrictEqual(["233"])
    })

    test("readonly", () => {
        const entity: DBConfig.PartialEntity<Conf> = {
            a: {
                b: ["a", "b"]
            }
        }
        const endpoints = EntityPropertyInjection.getReadonlyEndpoints(config, {titles, entity})
        expect(endpoints.a.$section.title).toBe("Section A")
        expect(endpoints.a.b.title).toBe("B")
        expect(endpoints.a.b.value).toStrictEqual(["a", "b"])
    })
})
