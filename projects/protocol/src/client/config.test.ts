import {FieldConfig} from "./config"

describe("config test", () => {
    it("endpoints check", () => {
        expect(FieldConfig.Fields.isEndpointType(FieldConfig.Fields.id())).toBeTruthy()
        expect(FieldConfig.Fields.isEndpointType(FieldConfig.Fields.avatar())).toBeTruthy()
        expect(FieldConfig.Fields.isEndpointType(FieldConfig.Fields.gallery())).toBeTruthy()
        expect(FieldConfig.Fields.isEndpointType(FieldConfig.Fields.tag("test"))).toBeTruthy()
        expect(FieldConfig.Fields.isEndpointType(FieldConfig.Fields.tagList("test"))).toBeTruthy()
        expect(FieldConfig.Fields.isEndpointType(FieldConfig.Fields.number({}))).toBeTruthy()
        expect(FieldConfig.Fields.isEndpointType({})).toBeFalsy()
    })
})
