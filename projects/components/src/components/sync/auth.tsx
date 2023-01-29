import { Button, useLocalDBinding } from "@pltk/components";
import { Input, Modal, Select, Steps } from "antd";
import { useEffect, useState } from "react";
import { OctokitCertificationStore, OctokitClient, OctokitResults } from "../../sync";

export interface GithubAuthDialogProps {
    onClose(cert: null | OctokitCertificationStore.IGithubCert): void
    dangerousCancel?: boolean
}

type AuthSteps = {
    "acknowledgement": {},
    "acquireToken": {},
    "selectRepo": {token: string, repoList: OctokitResults.Repo[]},
    "selectBranch": {token: string, owner: string, repo: string, branchList: string[]},
    "complete": {token: string, owner: string, repo: string, branch: string}
}

const StepIndex: Record<keyof AuthSteps, number> = {
    acknowledgement: 0,
    acquireToken: 1,
    selectRepo: 2,
    selectBranch: 3,
    complete: 4
}

type StepState = {
    [K in keyof AuthSteps]: {
        step: K,
        payload: AuthSteps[K]
    }
}[keyof AuthSteps]

export function GithubAuthDialog(props: GithubAuthDialogProps) {
    const [step, setStep] = useState<StepState>({step: "acknowledgement", payload: {}})
    const [token, setToken] = useState("")
    const [repo, setRepo] = useState<null | OctokitResults.Repo>(null)
    const [branch, setBranch] = useState<null | string>(null)

    let content: React.ReactNode
    switch(step.step) {
        case "acknowledgement":
            content = (<div>
                <p>欢迎您，创作者！</p>
                <p>您将使用GitHub账号登录并编辑本数据库内容。</p>
                <p>
                准备工作:
                <ul>
                    <li>当前浏览器能够连接GitHub</li>
                    <li>拥有GitHub账号</li>
                    <li>了解GitHub的各种概念</li>
                    <li>创建或fork存储数据的GitHub项目</li>
                </ul>
                </p>
                <p>
                注意事项:
                <ul>
                    <li>连接成功后将进行一次同步，同步后的数据可能有所不同</li>
                </ul>
                </p>
            </div>)
            break
        case "acquireToken":
            content = (<div>
                <p>您需要创建并提供GitHub账号的连接凭据，本页面可使用该凭据修改您的项目内容，该凭据仅存储在浏览器本地，您以外的其他人无法获取。</p>
                <p>
                <ul>
                    <li>打开GitHub凭据创建页: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank">github.com/settings/personal-access-tokens/new</a></li>
                    <li>输入密码验证GitHub账号</li>
                    <li>在"Token name"中填写凭据名称，以便以后在GitHub上找到这个凭据(如: "xnh db")</li>
                    <li>在"Expiration"中选择有效期，超出有效期后需要重新完成当前流程</li>
                    <li>在"Repository access"中，选择"All repositories"允许本页面访问您的所有项目，或者选择"Only select repositories"，并选择您要编辑的项目</li>
                    <li>在"Permissions"中，展开"Repository permissions", 在"Contents"一项选中"Access: Read and write"，允许本页面写入到该项目</li>
                    <li>点击"Generate token"生成凭据</li>
                    <li>复制凭据，并粘贴到下方的输入框中</li>
                </ul>
                </p>
                <p>
                    <Input value={token} onChange={evt => setToken(evt.target.value)}/>
                </p>
            </div>)
            break
        case "selectRepo":
            console.log(step.payload.repoList)
            content = (<div>
                <p>
                    选择您要编辑的项目
                </p>
                <Select
                    style={{width: "100%"}}
                    value={repo ? `${repo.owner}/${repo.repo}` : ""}
                    onChange={value => {
                        const pair = value.split("/")
                        if(pair.length == 2) {
                            const [owner, repo] = pair
                            setRepo({owner, repo})
                        }
                    }}
                    options={step.payload.repoList.map(it => ({
                        label: `${it.owner}/${it.repo}`,
                        value: `${it.owner}/${it.repo}`
                    }))}
                />
            </div>)
            break
        case "selectBranch":
            content = (<div>
                <p>
                    选择您要编辑的分支
                </p>
                <Select 
                    style={{width: "100%"}}
                    value={branch}
                    onChange={setBranch}
                    options={step.payload.branchList.map(it => ({
                        label: it,
                        value: it
                    }))}
                />
            </div>)
            break
        case "complete":
            content = (<div>
                <p>准备开始编辑了，请继续吧！</p>
            </div>)
            break
    }

    return <Modal open={true} onCancel={() => props.onClose(null)} okText="继续" onOk={onNextStep} cancelButtonProps={{danger: props.dangerousCancel}}>
        <Steps
            current={StepIndex[step.step]}
            items={[
                {title: "须知"},
                {title: "获取GitHub密钥"},
                {title: "选择项目"},
                {title: "选择分支"},
                {title: "完成"}
            ]}
        />
        {content}
    </Modal>

    async function onNextStep() {
        switch(step.step) {
            case "acknowledgement":
                setStep({step: "acquireToken", payload: {}})
                break
            case "acquireToken":
                if(token){
                    const client = new OctokitClient(token)
                    const repoList = await client.getRepos()
                    setStep({step: "selectRepo", payload: {token, repoList}})
                }
                break
            case "selectRepo":
                if(token && repo) {
                    const client = new OctokitClient(token)
                    const branchList = await client.getBranches(repo)
                    setStep({step: "selectBranch", payload: {token, ...repo, branchList}})
                }
                break
            case "selectBranch":
                if(token && repo && branch) {
                    setStep({step: "complete", payload: {token, ...repo, branch}})
                }
                break
            case "complete":
                if(token && repo && branch) {
                    props.onClose({
                        token,
                        repo: {
                            ...repo,
                            branch
                        }
                    })
                }
                break
        }
    }
}

function getCurrentMode(): "online" | "offline" {
    if(OctokitCertificationStore.cert.get()) {
        return "online"
    } else {
        return "offline"
    }
}

export function DBLoginButton() {
    const [state, setState] = useState<"online" | "offline" | "login">("offline")
    useEffect(() => {
        setState(getCurrentMode())
    }, [])

    if(state === "offline") {
        return <Button onClick={() => {setState("login")}}>登录</Button>
    } else if (state === "online") {
        return <Button onClick={() => {
            OctokitCertificationStore.cert.clear()
            setState("offline")
        }}>退出</Button>
    } else {
        return <GithubAuthDialog
            onClose={cert => {
                if(cert) {
                    OctokitCertificationStore.cert.set(cert)
                    setState("online")
                } else {
                    setState("offline")
                }
            }}
        />
    }
}
