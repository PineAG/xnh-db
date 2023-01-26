import { CollectionIndex, IRelationClient } from "./base"

type Side = "left" | "right"

export interface ITwoWayRelationClient<Payload> {
    getIndex<S extends Side>(side: S): Promise<CollectionIndex>
    getTargetsById<S extends Side>(side: S, id: string): Promise<Record<string, Payload>>
    getPayload(leftId: string, rightId: string): Promise<Payload>
    linkPair(leftId: string, rightId: string, payload: Payload, updateAt: Date): Promise<void>
    unlinkPair(leftId: string, rightId: string, updateAt: Date): Promise<void>
    unlinkAllTargetsById<S extends Side>(side: S, id: string): Promise<void>
}

export function createTwoWayRelationAdapters<Payload>(client: ITwoWayRelationClient<Payload>): [IRelationClient<Payload>, IRelationClient<Payload>] {
    return [
        new TwoWayRelationClientAdapter<Payload>(client, "left"),
        new TwoWayRelationClientAdapter<Payload>(client, "right")
    ]
}

class TwoWayRelationClientAdapter<Payload> implements IRelationClient<Payload> {
    constructor(private internal: ITwoWayRelationClient<Payload>, private side: Side) {}
    getPayload(id: string, targetId: string): Promise<Payload> {
        throw new Error("Method not implemented.")
    }
    getIndex(): Promise<CollectionIndex> {
        return this.internal.getIndex(this.side)
    }
    getTargetsById(id: string): Promise<Record<string, Payload>> {
        return this.internal.getTargetsById(this.side, id)   
    }
    async linkToTarget(id: string, targetId: string, payload: Payload, updateAt: Date): Promise<void> {
        if(this.side === "left") {
            await this.internal.linkPair(id, targetId, payload, updateAt)
        } else {
            await this.internal.linkPair(targetId, id, payload, updateAt)
        }
    }
    async unlinkTarget(id: string, targetId: string, updateAt: Date): Promise<void> {
        if(this.side === "left") {
            await this.internal.unlinkPair(id, targetId, updateAt)
        } else {
            await this.internal.unlinkPair(targetId, id, updateAt)
        }
    }
    async unlinkAllTargetsById(id: string): Promise<void> {
        await this.internal.unlinkAllTargetsById(this.side, id)
    }
}

export class TwoWayRelationBinder<Payload> implements ITwoWayRelationClient<Payload> {
    constructor(private left: IRelationClient<Payload>, private right: IRelationClient<Payload>){}
    
    getPayload(leftId: string, rightId: string): Promise<Payload> {
        throw new Error("Method not implemented.")
    }

    getIndex<S extends Side>(side: S): Promise<CollectionIndex> {
        const client = (side === "left" ? this.left : this.right)
        return client.getIndex()
    }

    getTargetsById<S extends Side>(side: S, id: string): Promise<Record<string, Payload>> {
        const client = (side === "left" ? this.left : this.right)
        return client.getTargetsById(id)
    }
    
    async linkPair(leftId: string, rightId: string, payload: Payload, updateAt: Date): Promise<void> {
        await Promise.all([
            this.left.linkToTarget(leftId, rightId, payload, updateAt),
            this.right.linkToTarget(rightId, leftId, payload, updateAt)
        ])
    }
    
    async unlinkPair(leftId: string, rightId: string, updateAt: Date): Promise<void> {
        await Promise.all([
            this.left.unlinkTarget(leftId, rightId, updateAt),
            this.right.unlinkTarget(rightId, leftId, updateAt)
        ])
    }

    async unlinkAllTargetsById<S extends Side>(side: S, id: string): Promise<void> {
        const client = (side === "left" ? this.left : this.right)
        const targetClient = (side === "right" ? this.left : this.right)
        const targets = await client.getTargetsById(id)
        const updatedAt = new Date()
        await Promise.all(targets.map(targetId => targetClient.unlinkTarget(targetId, id, updatedAt)))
        await client.unlinkAllTargetsById(id)
    }
}
