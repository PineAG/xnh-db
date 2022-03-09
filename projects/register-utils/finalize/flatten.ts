import { XNHBaseClassIndices, XNHClasses, XNHImportedData } from "@xnh-db/types"
import {UnionToIntersection, DeepPartial} from 'utility-types'


type RelKeys = keyof UnionToIntersection<XNHImportedData["value"]["rel"]>

const classRel: [XNHClasses, XNHClasses, RelKeys, RelKeys][] = [
    ['character', 'artwork', '角色', '出处'],
    ['character', 'creator', '角色', '创作者'],
    ['character', 'voice-actor', '角色', '配音'],
    ['artwork', 'creator', '作品', '创作者']
]

function updatePathInObject<T>(target: {}, path: string[], value: T){
    const lastKey = path[path.length-1]
    const prefixKeys = path.slice(0, path.length-1)
    for(const k of prefixKeys){
        if(target[k] === undefined){
            target[k] = {}
        }
        target = target[k]
    }
    target[lastKey] = value
}

type ClassRelIndexType = {[T1 in XNHClasses]: {[A1 in keyof XNHBaseClassIndices[T1]["rel"]]: {
    type: XNHClasses,
    key: RelKeys
}}}

const classRelIndex: ClassRelIndexType = (() => {
    const index: DeepPartial<ClassRelIndexType> = {}
    for(const [t1, t2, a2, a1] of classRel){
        updatePathInObject(index, [t1, a1], {type: t2, key: a2})
        updatePathInObject(index, [t2, a2], {type: t1, key: a1})
    }
    return index as ClassRelIndexType
})()

interface InheritSetting {
    predAttr: RelKeys
    fromAttr: RelKeys
    toAttr: RelKeys
}

const inheritRel: {[K in XNHClasses]: InheritSetting[]} = {
    'artwork': [],
    'character': [{predAttr: '出处', fromAttr: '创作者', toAttr: '创作者'}],
    'creator': [],
    'voice-actor': []
}

const successorRef: {[K in XNHClasses]: RelKeys[]} = {
    'artwork': [],
    'character': [],
    'creator': [],
    'voice-actor': []
}

{
    for(const k of Object.keys(inheritRel)){
        for(const conf of inheritRel[k]){
            const reverse = classRelIndex[k][conf.predAttr]
            successorRef[reverse.type].push(reverse.key)
        }
    }
}

class DistinctQueue<T> {
    exists: Set<T>
    queue: T[]
    constructor(){
        this.exists = new Set()
        this.queue = []
    }
    push(val: T): boolean{
        if(this.exists.has(val)) return false;
        this.exists.add(val)
        this.queue.push(val)
        return true;
    }
    pop(): T {
        const val = this.queue.shift()
        this.exists.delete(val)
        return val
    }
    get size(): number {
        return this.exists.size
    }
    get empty(): boolean {
        return this.size === 0
    }
}

type NeighborMap = Map<string, {[key:string]: Set<string>}>
function initNeighborMap(memoryDB: Map<string, XNHImportedData>): NeighborMap {
    const nMap: NeighborMap = new Map();
    for(const v of memoryDB.values()){
        const rel = {}
        for(const r of Object.keys(v.value.rel)){
            rel[r] = new Set(v.value.rel[r].map(it => it.id))
        }
        nMap.set(v.id, rel)
    }
    return nMap
}


export function flattenDependencies(memoryDB: Map<string, XNHImportedData>){
    const updateQueue = new DistinctQueue<string>()
    const neighborMap = initNeighborMap(memoryDB)
    for(const v of memoryDB.values()){
        updateQueue.push(v.id)
    }
    while(!updateQueue.empty){
        const leftId = updateQueue.pop()
        const leftType = memoryDB.get(leftId).type
        const leftNeighborsSet = neighborMap.get(leftId)
        for(const inheritConf of inheritRel[leftType]){
            for(const predId of leftNeighborsSet[inheritConf.predAttr]){
                for(const predVal of neighborMap.get(predId)[inheritConf.fromAttr]){
                    leftNeighborsSet[inheritConf.toAttr].add(predVal)
                }
            }
        }
        for(const leftKey in leftNeighborsSet){
            const leftNeighbors = leftNeighborsSet[leftKey]
            const rightKey = classRelIndex[leftType][leftKey].key
            const rightType = classRelIndex[leftType][leftKey].type
            for(const rightId of leftNeighbors){
                const rightNeighborSet = neighborMap.get(rightId)
                const rightNeighbors = rightNeighborSet[rightKey]
                if(!leftNeighbors.has(rightId) || !rightNeighbors.has(leftId)){
                    updateQueue.push(rightId)
                    for(const successorAttr of successorRef[rightType]){
                        for(const successorId of rightNeighborSet[successorAttr]){
                            updateQueue.push(successorId)
                        }
                    }
                }
                leftNeighbors.add(rightId)
                rightNeighbors.add(leftId)
            }
        }
    }

    // write back
    for(const v of memoryDB.values()){
        for(const k in v.value.rel){
            const target = v.value.rel[k] = []
            for(const relId of neighborMap.get(v.id)[k]){
                target.push(memoryDB.get(relId))
            }
        }
    }
}