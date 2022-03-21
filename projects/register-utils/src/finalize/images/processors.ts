import fs from 'fs'
import path from 'path'
import {cv} from 'opencv-wasm'
import Jimp from 'jimp'
import { ProcessorType } from './utils';
import { maxBy } from 'lodash';

const animeFaceCascade = 'lbpcascade_animeface.xml'

const cascadePromises = new Map<string, Promise<void>>()

async function loadCascade(name: string): Promise<any> {
    if(!cascadePromises.has(name)){
        const p = fs.promises.readFile(path.join(__dirname, name))
            .then(xmlData => {
                cv.FS_createDataFile(
                    '/', name, xmlData, 
                    true, false, false
                )
            })
        cascadePromises.set(name, p)
    }
    await cascadePromises.get(name)
    const cascade = new cv.CascadeClassifier()
    cascade.load(name)
    return cascade
}

async function pCropAnimeAvatar(img: Jimp): Promise<Jimp> {
    const src = cv.matFromImageData(img.bitmap)
    const gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0)
    const cascade = await loadCascade(animeFaceCascade)
    const msize = new cv.Size(0, 0)
    const faces = new cv.RectVector()
    cascade.detectMultiScale(gray, faces, 1.01, 3, 0, msize, msize)
    const faceRects: {[K in ('x'|'y'|'w'|'h')]: number}[] = []
    for(let i=0; i<faces.size(); i++){
        const {x, y, width, height} = faces.get(i)
        faceRects.push({x, y, w: width, h: height})
    }
    src.delete()
    gray.delete()
    cascade.delete()
    faces.delete()
    if(faceRects.length === 0){
        throw Error("No face detected.")
    }
    const {x, y, w, h} = maxBy(faceRects, ({w, h}) => w*h)
    const result = img.crop(x, y, w, h)
    return result
}

async function handleImageProcessor(img: Jimp, procType: ProcessorType): Promise<Jimp> {
    if(procType === 'crop-anime-avatar'){
        return await pCropAnimeAvatar(img)
    }
    throw new Error(`Unknown image processor: ${procType}`)
}

export async function processImage(srcFile: string, dstFile: string, cacheDir: string, processors: ProcessorType[]) {
    if(processors.length === 0){
        await fs.promises.copyFile(srcFile, dstFile)
        return
    }
    console.log(srcFile, processors.join('!'), '=>', dstFile, `(Cache: ${cacheDir})`)
    if(!fs.existsSync(cacheDir)){
        fs.promises.mkdir(cacheDir, {recursive: true})
    }
    const srcBaseName = path.basename(srcFile)
    const cachedFile = path.join(cacheDir, `${srcBaseName}_${processors.join('_')}.png`)
    if(!fs.existsSync(cachedFile)){
        let img = await Jimp.read(srcFile)
        for(const proc of processors){
            img = await handleImageProcessor(img, proc)
        }
        await img.writeAsync(cachedFile)
    }else{
        console.log(`Using cache: ${cachedFile}`)
    }
    await fs.promises.copyFile(cachedFile, dstFile)
}
