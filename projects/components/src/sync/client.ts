import {Octokit} from "@octokit/rest"

async function test() {
    const octokit = new Octokit()
    const repo = await octokit.repos.createOrUpdateFileContents()
    octokit.repos.deleteFile()
    octokit.repos.getContent()
}

export class OctokitFileClient {
    private octokit: Octokit
    constructor(){

    }

    // async readFile(): Promise<null | Blob> {

    // }
}
