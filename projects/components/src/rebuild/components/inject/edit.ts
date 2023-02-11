import { FieldConfig } from "@xnh-db/protocol";
import { XBinding } from "../binding";

export module EndpointEditors {
    
    export function renderEndpoint<T extends FieldConfig.Fields.EndpointValueTypes>(binding: XBinding.Binding<T | undefined>, config: FieldConfig.Fields.EndpointTypes): React.ReactNode {

    }
}