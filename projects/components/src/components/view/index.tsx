import { DBDeclaration } from "@xnh-db/protocol"
import React from "react"
import { CharacterSearchResultView } from "./character"

export * from "./image"
export * from "./character"

export const entitySearchResultViews: Record<keyof DBDeclaration, React.FC<{id: string}>> = {
    character: CharacterSearchResultView,
    artwork: () => <div>TODO</div>,
    voiceActor: () => <div>TODO</div>,
    creator: () => <div>TODO</div>
}
