import { FieldConfig } from "@xnh-db/protocol";
import { DeepPartial } from "utility-types";
import { DbContexts } from "../context";
import { GlobalSyncComponents } from "./globalSync";

export module SyncFileUtils {
    export function useMarkCollectionDirtyFiles<T extends FieldConfig.EntityBase>(collectionName: string) {
        const conf = DbContexts.useProps().props.collections[collectionName].config
        const markDirtyFiles = useMarkDirtyFiles()
        return (entity: DeepPartial<T>, isDirty: boolean) => markDirtyFiles<T>(entity, conf, isDirty)
    }

    export function useMarkPayloadDirtyFiles<T extends FieldConfig.EntityBase>(relationName: string) {
        const conf = DbContexts.useProps().props.relations[relationName].payloadConfig
        const markDirtyFiles = useMarkDirtyFiles()
        return (entity: DeepPartial<T>, isDirty: boolean) => markDirtyFiles<T>(entity, conf, isDirty)
    }

    export function useClearDirtyFiles() {
        const client = GlobalSyncComponents.useQueryClients().files
        return () => client.clearDirtyFiles()
    }

    export function useMarkDirtyFiles() {
        const client = GlobalSyncComponents.useQueryClients().files
        return async <T extends FieldConfig.EntityBase>(d: DeepPartial<T>, c: FieldConfig.ConfigFromDeclaration<T>, isDirty: boolean) => {
            for(const fn of walkFileNames(d, c)) {
                await client.markDirtyFile(fn, isDirty)
            }
        }
    }

    export function* walkFileNames(d: any, c: any): Generator<string> {
        if(FieldConfig.Fields.isEndpointType(c)) {
            if(c.type === "avatar" && FieldConfig.isValidEndpointValue(c, d)) {
                yield d
            } else if(c.type === "gallery" && FieldConfig.isValidEndpointValue(c, d)) {
                for(const f of d){
                    yield f
                }
            }
        }else{
            if(!d) return;
            for(const k of Object.keys(c)) {
                yield* walkFileNames(d[k], c[k])
            }
        }
    }
}
