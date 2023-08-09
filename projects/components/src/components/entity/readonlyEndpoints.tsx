import { DBConfig } from "@xnh-db/common"
import { StagingStore } from "@xnh-db/core"

export module ReadonlyEndpointComponents {
    import Types = DBConfig.Field.Types;

    interface Props<N extends Types> {
        title: string
        config: DBConfig.Field.Field<N>
        path: string
        value: DBConfig.Field.Payloads[N]
    }

    export function TagList(props: Props<Types.TagList>) {
        return <></>
    }

    export function TextInput(props: Props<Types.FullText>) {
        return <></>
    }

    export function TextInputList(props: Props<Types.FullTextList>) {
        return <></>
    }

    export function ImageViewer(props: Props<Types.File>) {
        return <></>
    }

    export function GalleryViewer(props: Props<Types.FileList>) {
        return <></>
    }

    export function AudioPlayer(props: Props<Types.FileList>) {
        return <></>
    }
}
