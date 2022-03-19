const path = require('path');

import { XNHClasses, XNHExportedData, XNHImportedData } from "@xnh-db/types"
import { ImportData } from "@xnh-db/types/utils"
import { RegistrationProps } from ".";
import { exportAssets } from "./assets";
import { dumpJSON, mkPath } from "./utils"

export async function exportJsonDoc(props: RegistrationProps, memoryDB: Map<string, XNHImportedData>) {
    const outputDir = path.join(props.outputDir, 'items')
    await mkPath(outputDir)
    for (let doc of memoryDB.values()) {
        const relLinks: { [key: string]: { id: string, type: XNHClasses }[] } = {}
        for (const [k, v] of Object.entries(doc.value.rel as { [key: string]: ImportData<any>[] })) {
            relLinks[k] = v.map(x => ({ id: x.id, type: x.type, title: x.title }))
        }
        const exportData = {
            id: doc.id,
            title: doc.title,
            type: doc.type,
            props: doc.value.props,
            files: await exportAssets(doc.files, props),
            rel: relLinks
        }
        await dumpJSON(path.join(outputDir, `${doc.id}.json`), exportData)
    }
}