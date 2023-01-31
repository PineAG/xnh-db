export module ProgressResult {
    export type ItemActionType = "create" | "update" | "delete"

    export interface ItemAction {
        type: ItemActionType
        id: string
        progress: {
            current: number
            total: number
        }
    }
    
    export type Progress = {type: "index", action: "pull" | "push"} | {type: "item" | "file", action: ItemAction}
}
