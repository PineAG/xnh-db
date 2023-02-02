import { UserOutlined } from "@ant-design/icons";
import { Avatar } from "antd";
import { useEffect, useState } from "react";
import { useDBClients } from "../sync";

export function AsyncAvatar({filename}: {filename: string | undefined}) {
    const [url, setUrl] = useState<string | null>(null)
    const clients = useDBClients()

    useEffect(() => {
        if(filename) {    
            clients.query.files.read(filename).then(blob => {
                setUrl(URL.createObjectURL(blob))
            })
        }
        return () => {
            if(url) {
                URL.revokeObjectURL(url)
                setUrl(null)
            }
        }
    }, [filename])

    if(url === null) {
        return <Avatar
            size="large"
            icon={<UserOutlined/>}
        />
    } else {
        return <Avatar
            size="large"
            src={url}
        />
    }
}
