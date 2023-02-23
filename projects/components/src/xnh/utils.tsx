import { FieldConfig } from "@xnh-db/protocol";
import { DbUiConfiguration, FormItem } from "../rebuild";


type PropsBase = DbUiConfiguration.Layouts.ItemLayoutProps<FieldConfig.EntityBase>
export function ExpandedProps<P extends PropsBase>(props: {props: P}) {
    const {$title, ...rest} = props.props
    if(rest["$element"]) {
        return <FormItem label={$title}>
            {rest["$element"] as any}
        </FormItem>
    } else {
        
    }
}