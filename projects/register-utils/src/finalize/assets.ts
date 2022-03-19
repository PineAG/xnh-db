const path = require('path')
const fs = require('fs')
import { BaseBase, FileItem } from "@xnh-db/types/utils";
import { RegistrationProps } from ".";
import { mkPath } from "./utils";

async function dumpAsset(props: RegistrationProps, name: FileItem): Promise<string> {
    const srcPath = path.join(props.sourceImageDir, name)
    const dstPath = path.join(props.outputDir, name)
    const outputPath = path.join('/', props.imagePublicDir, name)
    await fs.promises.copyFile(srcPath, dstPath)
    return outputPath
}

export async function exportAssets(files: BaseBase["files"], props: RegistrationProps): Promise<BaseBase["files"]>{
    const result: BaseBase["files"] = {}
    const imageDstDir = path.join(props.outputDir, props.imagePublicDir)
    mkPath(imageDstDir)
    for(const [k, v] of Object.entries(files)){
        if(v === null){
            result[k] = v
        }else if(typeof v === "string"){
            result[k] = await dumpAsset(props, v)
        }else{
            result[k] = await Promise.all(v.map(name => dumpAsset(props, name)))
        }
    }

    return result
}