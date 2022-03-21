import path from 'path'
import { BaseBase, FileItem } from "@xnh-db/types/utils";
import { RegistrationProps } from ".";
import { mkPath } from "./utils";
import {processImage} from './images/processors'
import { ProcessorType } from './images/utils';

async function dumpAsset(props: RegistrationProps, name: FileItem): Promise<string> {
    const [realName, ...processorNames] = name.split('!')
    const dstName = processorNames.length === 0 ? realName : `${path.basename(realName)}_${processorNames.join("_")}.png`
    const srcPath = path.join(props.sourceImageDir, realName)
    const dstPath = processorNames.length === 0 ? path.join(props.outputDir, dstName) : path.join(props.outputDir, 'images', dstName)
    const outputPath = `${realName}`
    await processImage(srcPath, dstPath, 'cachedImages', processorNames as ProcessorType[])
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