const path = require('path');
const fs = require('fs');

import { XNHImportedData } from "@xnh-db/types";
import { memoryDB } from '..';
import { flattenDependencies } from "./flatten";
import {dumpJSON, rmtree} from './utils'
import { generateSearchIndex } from "./search";
import { exportJsonDoc } from "./exportJson";


async function exportGlobalIndex(outputFile: string, memoryDB: Map<string, XNHImportedData>){
    await dumpJSON(outputFile, Array.from(memoryDB.keys()))
}



export interface RegistrationProps {
    outputDir: string,
    sourceImageDir: string,
    imagePublicDir: string
}

export async function finalizeRegistration(props: RegistrationProps) {
    flattenDependencies(memoryDB)
    if (fs.existsSync(props.outputDir)) {
        await rmtree(props.outputDir)
    }
    const dstImageDir = path.join(props.outputDir, 'all.json')
    if (fs.existsSync(dstImageDir)) {
        await rmtree(dstImageDir)
    }
    await exportJsonDoc(props, memoryDB)
    await generateSearchIndex(path.join(props.outputDir, 'search'), memoryDB, 10)
    await exportGlobalIndex(path.join(props.outputDir, 'all.json'), memoryDB)
}
