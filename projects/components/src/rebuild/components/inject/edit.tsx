import { FieldConfig } from "@xnh-db/protocol";
import { XBinding } from "../binding";

export module EndpointEditors {

    interface Props<CType extends FieldConfig.Fields.EndpointNames> {
        binding: XBinding.Binding<FieldConfig.Fields.ValueOfEndpoint[CType] | string>
        config: FieldConfig.Fields.FieldTypes[CType]
    }
    
    function Avatar(props: Props<"avatar">) {
        return <></>
    }
    
    function FullText(props: Props<"fullText">) {
        return <></>
    }
    
    function FullTextList(props: Props<"fullTextList">) {
        return <></>
    }
    
    function Gallery(props: Props<"gallery">) {
        return <></>
    }
    
    function Id(props: Props<"id">) {
        return <></>
    }
    
    function Number(props: Props<"number">) {
        return <></>
    }
    
    function Tag(props: Props<"tag">) {
        return <></>
    }
    
    function TagList(props: Props<"tagList">) {
        return <></>
    }
    
    
    export function renderEndpoint<T extends FieldConfig.Fields.EndpointValueTypes>(inputBinding: XBinding.Binding<T | undefined>, parentValue: T | undefined, config: FieldConfig.Fields.EndpointTypes): React.ReactNode {
        const binding = inputBinding as XBinding.Binding<any>
        switch(config.type) {
            case "avatar": return <Avatar binding={binding} config={config}/>
            case "fullText": return <FullText binding={binding} config={config}/>
            case "fullTextList": return <FullTextList binding={binding} config={config}/>
            case "gallery": return <Gallery binding={binding} config={config}/>
            case "id": return <Id binding={binding} config={config}/>
            case "number": return <Number binding={binding} config={config}/>
            case "tag": return <Tag binding={binding} config={config}/>
            case "tagList": return <TagList binding={binding} config={config}/>
            default:
                throw new Error(`Invalid config: ${config}`)
        }
    }
}