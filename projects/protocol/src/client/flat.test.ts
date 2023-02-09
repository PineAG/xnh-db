import { FieldConfig } from "./config"
import {ConfigFlatten} from "./flat"

const F = FieldConfig.Fields

type ITest = {
    a: {
        b: {
            c: {
                d: number
            }
        }
    }
}

const testItem: ITest = {
    a: {b: {c: {d: 233}}}
}

const TestConf = FieldConfig.makeConfig.for<ITest>().as({
    a: {
        b: {
            c: {
                d: F.number({min: 0, max: 100, step: 1, default: 15})
            }
        }
    }
})

describe("flat tests", () => {
    it("flatten config", async () => {
        const result = ConfigFlatten.flattenConfig(TestConf)
        const [[key, value]] = result
        expect(key).toEqual(["a", "b", "c", "d"])
        expect(value.type).toBe("number")
    })
    it("flatten values", async () => {
        const flat = ConfigFlatten.flattenDataByConfig(testItem, TestConf)
        const value = flat["a_b_c_d"]
        expect(value).toEqual(233)

        const data = ConfigFlatten.extractFlatDataByConfig(flat, TestConf)
        expect(data?.a?.b?.c?.d).toBe(233)
    })
})