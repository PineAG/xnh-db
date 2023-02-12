import { DbUiConfiguration } from "../../config";
import { XBinding } from "../binding";
import { DbContexts } from "../context";
import { GlobalSyncComponents } from "../sync";

export module SearchResultComponents {
    type GPBase = DbUiConfiguration.GlobalPropsBase
    import Utils = DbUiConfiguration.InternalUtils

    export interface CollectionItemSelectorProps {
        collectionName: string
        binding: XBinding.Binding<string | null>
    }

    export function CollectionItemSelector(props: CollectionItemSelectorProps) {
        const config = DbContexts.useProps()
        const clients = GlobalSyncComponents.useClients()
        return <span>还没做</span>
        // TODO:
    }
}
