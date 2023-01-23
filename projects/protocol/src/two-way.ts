import { CollectionIndex, IRelationClient } from "./client"

type Side = "left" | "right"

export interface ITwoWayRelationClient {
    getIndex<S extends Side>(side: S): Promise<CollectionIndex>
    getTargetsById<S extends Side>(side: S, id: string): Promise<string[]>
    linkPair(leftId: string, rightId: string, updateAt: Date): Promise<void>
    unlinkPair(leftId: string, rightId: string, updateAt: Date): Promise<void>
    unlinkAllTargetsById<S extends Side>(side: S, id: string): Promise<void>
}

export function createTwoWayRelationAdapters(client: ITwoWayRelationClient): [IRelationClient, IRelationClient] {
    return [
        new TwoWayRelationClientAdapter(client, "left"),
        new TwoWayRelationClientAdapter(client, "right")
    ]
}

class TwoWayRelationClientAdapter<S extends Side> implements IRelationClient {
    constructor(private internal: ITwoWayRelationClient, private side: S) {}
    getIndex(): Promise<CollectionIndex> {
        return this.internal.getIndex(this.side)
    }
    getTargetsById(id: string): Promise<string[]> {
        return this.internal.getTargetsById(this.side, id)   
    }
    async linkToTarget(id: string, targetId: string, updateAt: Date): Promise<void> {
        if(this.side === "left") {
            await this.internal.linkPair(id, targetId, updateAt)
        } else {
            await this.internal.linkPair(targetId, id, updateAt)
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

export class TwoWayRelationBinder implements ITwoWayRelationClient {
    constructor(private left: IRelationClient, private right: IRelationClient){}

    getIndex<S extends Side>(side: S): Promise<CollectionIndex> {
        const client = (side === "left" ? this.left : this.right)
        return client.getIndex()
    }

    getTargetsById<S extends Side>(side: S, id: string): Promise<string[]> {
        const client = (side === "left" ? this.left : this.right)
        return client.getTargetsById(id)
    }
    
    async linkPair(leftId: string, rightId: string, updateAt: Date): Promise<void> {
        await Promise.all([
            this.left.linkToTarget(leftId, rightId, updateAt),
            this.right.linkToTarget(rightId, leftId, updateAt)
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
