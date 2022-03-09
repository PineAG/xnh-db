const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

import { XNHClasses } from "@xnh-db/types";
import { memoryDB } from '..';
import { ImportData } from '@xnh-db/types/utils';
import { flattenDependencies } from "./flatten";


async function exportJson(outputDir: string) {
    await fs.promises.mkdir(outputDir, { recursive: true })
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
        const rawJson = JSON.stringify(exportData)
        await fs.promises.writeFile(path.join(outputDir, `${doc.id}.json`), rawJson)
    }
}

export async function finalizeRegistration(outputDir: string) {
    flattenDependencies(memoryDB)
    if (fs.existsSync(outputDir)) {
        await new Promise((resolve, reject) => {
            rimraf(outputDir, err => err ? reject(err) : resolve(null))
        })
    }
    exportJson(path.join(outputDir, 'items'))
}