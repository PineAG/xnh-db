import { InternalGlobalLayouts } from "..";
import { AntdGlobalComponents } from "./components";
import { AntdEndpointEditors } from "./editors";
import { AntdEndpointViewers } from "./viewers";

export const AntdComponents: InternalGlobalLayouts.GlobalLayoutProps = {
    endpoint: {
        viewers: AntdEndpointViewers.viewers,
        editors: AntdEndpointEditors.editors
    },
    components: AntdGlobalComponents.components
}