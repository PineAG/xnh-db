import { DBDeclaration } from "@xnh-db/protocol"
import React from "react"
import { CharacterSearchResultView } from "./character"

export * from "./image"
export * from "./character"
export * from "./editable"
export * from "./view"

export const entitySearchResultViews: Record<keyof DBDeclaration, React.FC<{id: string, onOpen?: () => void}>> = {
    character: CharacterSearchResultView,
    artwork: () => <div>TODO</div>,
    voiceActor: () => <div>TODO</div>,
    creator: () => <div>TODO</div>
}
