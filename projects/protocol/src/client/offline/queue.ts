import { FieldConfig } from "../config"

export module OfflineSyncQueue {
    export interface IQueue {
        appendAction(action: Actions.Action): Promise<void>
        popAction(): Promise<Actions.Action | null>
        count(): Promise<number>
        list(): Promise<Actions.Action[]>
    }

    export interface INotification {
        listen(callback: () => void): {close: () => void}
        emitChange(): void
    }

    export class QueueWithNotification implements IQueue {
        constructor(private queue: IQueue, private notification: INotification) {}

        async appendAction(action: Actions.Action): Promise<void> {
            await this.queue.appendAction(action)
            this.notification.emitChange()
        }
        async popAction(): Promise<Actions.Action | null> {
            const out = await this.queue.popAction()
            this.notification.emitChange()
            return out
        }
        count(): Promise<number> {
            return this.queue.count()
        }
        list(): Promise<Actions.Action[]> {
            return this.queue.list()
        }


    }

    type RelationKey = Record<string, string>

    export module Actions {
        export type WriteAction<K, P> = {
            id: K
            value: P
        }

        export type DeleteAction<K> = {
            id: K
        }

        
        type ActionParams = {
            "collection": {key: string, value: FieldConfig.EntityBase}
            "relation": {key: RelationKey, value: FieldConfig.EntityBase}
            "file": {key: string, value: Blob}
        }

        export type Action = {
            [K in keyof ActionParams]: {
                type: K
                ts: number
            } & (WriteAction<ActionParams[K]["key"], ActionParams[K]["value"]> | DeleteAction<ActionParams[K]["key"]>)
        }[keyof ActionParams]
    }
}
