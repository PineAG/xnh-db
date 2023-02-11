import { FieldConfig } from "@xnh-db/protocol";

export module EndpointViewers {
    interface Props<CType extends FieldConfig.Fields.EndpointNames> {
        value: FieldConfig.Fields.ValueOfEndpoint[CType] | string
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
    

    export function renderEndpoint<T extends FieldConfig.Fields.EndpointValueTypes>(inputValue: T | undefined, config: FieldConfig.Fields.EndpointTypes): React.ReactNode {
        const value = inputValue as any
        switch(config.type) {
            case "avatar": return <Avatar value={value} config={config}/>
            case "fullText": return <FullText value={value} config={config}/>
            case "fullTextList": return <FullTextList value={value} config={config}/>
            case "gallery": return <Gallery value={value} config={config}/>
            case "id": return <Id value={value} config={config}/>
            case "number": return <Number value={value} config={config}/>
            case "tag": return <Tag value={value} config={config}/>
            case "tagList": return <TagList value={value} config={config}/>
            default:
                throw new Error(`Invalid config: ${config}`)
        }
    }
}