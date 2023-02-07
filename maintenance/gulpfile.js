const gulp = require("gulp")
const process = require("process")
const path = require("path")
const fs = require("fs/promises")
const concurrently = require('concurrently');

const rootDir = path.resolve(__dirname, "..")

function execCommand(command, args, cwd) {
    const {spawn} = require("child_process")
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: "inherit",
            cwd: cwd,
            env: process.env,
            shell: true
        })
        child.on("error", code => reject(code))
        child.on("close", code => {
            if(code === 0) {
                resolve(code)
            } else {
                reject(code)
            }
        })
    })
}

async function buildProject(projectName) {
    const projDir = path.join(rootDir, projectName)
    await execCommand("yarn", ["build"], projDir)
}

function watchProject(projName) {
    const projDir = path.resolve(rootDir, "projects", projName)
    const files = ["./src/**/*.ts", "./src/**/*.tsx", "./src/**/*.json", "./src/**/*.css"]
    return gulp.watch(files, {
        cwd: projDir,
        ignoreInitial: false
    }, () => buildProject(projDir))
}

exports.watchDependencies = gulp.task("watchDependencies", () => {
    watchProject("protocol")
    watchProject("components")
})

exports.startDevServer = gulp.task("startDevServer", async () => {
    const projDir = path.resolve(rootDir, "projects", "viewer")
    await execCommand("yarn", ["start"], projDir)
})

exports.startDevServerAutoBuild = gulp.task("startDevServerAutoBuild", async () => {
    await concurrently([
        {
            command: "gulp watchDependencies"
        },
        {
            command: "gulp startDevServer"
        }
    ])
})
