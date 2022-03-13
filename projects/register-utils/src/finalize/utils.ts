const fs = require('fs');
const rimraf = require('rimraf');

export async function rmtree(outputDir){
    await new Promise((resolve, reject) => {
        rimraf(outputDir, err => err ? reject(err) : resolve(null))
    })
}

export async function dumpJSON<T>(filePath: string, data: T) {
    const rawJson = JSON.stringify(data)
    await fs.promises.writeFile(filePath, rawJson)
}

export async function mkPath(target: string){
    await fs.promises.mkdir(target, { recursive: true })
}