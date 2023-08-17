import { DBConfig } from "@xnh-db/common";
import { createContext } from "react";

export module ConfigContexts {
    export const DocumentTypeContext = createContext<Record<string, DBConfig.ConfigBase>>({})
}