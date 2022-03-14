const path = require('path');
const fs = require('fs');

import { XNHClasses, XNHImportedData } from "@xnh-db/types";
import { memoryDB } from '..';
import { ImportData } from '@xnh-db/types/utils';
import { flattenDependencies } from "./flatten";
import {dumpJSON, mkPath, rmtree} from './utils'
import { generateSearchIndex } from "./search";


async function exportGlobalIndex(outputFile: string, memoryDB: Map<string, XNHImportedData>){
    await dumpJSON(outputFile, Array.from(memoryDB.keys()))
}

async function exportJsonDoc(outputDir: string, memoryDB: Map<string, XNHImportedData>) {
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
            rel: relLinks
        }
        await dumpJSON(path.join(outputDir, `${doc.id}.json`), exportData)
    }
}

export async function finalizeRegistration(outputDir: string) {
    flattenDependencies(memoryDB)
    if (fs.existsSync(outputDir)) {
        await rmtree(outputDir)
    }
    await exportJsonDoc(path.join(outputDir, 'items'), memoryDB)
    await generateSearchIndex(path.join(outputDir, 'search'), memoryDB, 10)
    await exportGlobalIndex(path.join(outputDir, 'all.json'), memoryDB)
}
