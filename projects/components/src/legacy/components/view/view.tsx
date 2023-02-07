import { UserOutlined } from "@ant-design/icons"
import {useState, useEffect} from "react"
import { useDBClients, useLocalSyncResult } from "../sync"
import { useObjectURL, useObjectURLList } from "./image"
import { Avatar, AvatarProps, Image as AntImage, Empty as AntEmpty, ImageProps, Carousel } from "antd";
import { Loading } from "@pltk/components";
import { AvatarSize } from "antd/es/avatar/SizeContext";

export module PreviewViews {
    
    export function AsyncAvatar({filename, icon, avatarProps, size}: {filename: string | undefined, icon?: React.ReactNode, avatarProps?: AvatarProps, size?: AvatarSize}) {
        
        const localSync = useLocalSyncResult()
        const [url, setUrl] = useState<string | null>(null)
        const clients = useDBClients()

        useEffect(() => {
            let url: string | undefined
            if(filename) {    
                localSync.fetchFile(filename).then(blob => {
                    url = URL.createObjectURL(blob)
                    setUrl(url)
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
                size={size}
                icon={icon ?? <UserOutlined/>}
                {...avatarProps}
            />
        } else {
            return <Avatar
                size={size}
                src={url}
                {...avatarProps}
            />
        }
    }

    interface ImageListViewerProps {
        fileIdList: string[]
        width?: string | number
        height?: string | number
    }

    export function ImageListViewer(props: ImageListViewerProps) {
        const localSync = useLocalSyncResult()
        const [blobList, setBlobList] = useState<Blob[]>([])
        const urlList = useObjectURLList(blobList)
        const [showList, setShowList] = useState(false)

        const clients = useDBClients()

        useEffect(() => {
            loadImages()
        }, [props.fileIdList])

        if(urlList.length === 0) {
            return <AntEmpty/>
        }

        return <div>
            <div style={{width: props.width, height: props.height}} onClick={() => setShowList(true)}>
                <AntImage src={urlList[0]} preview={{visible: false}} width={props.width}/>
            </div>
            <div style={{display: "none"}}>
                <AntImage.PreviewGroup preview={{visible: showList, onVisibleChange: (vis) => setShowList(vis)}}>
                    {urlList.map((url, idx) => (<AntImage src={url} key={url}/>))}
                </AntImage.PreviewGroup>
            </div>
        </div>

        async function loadImages() {
            const blobList = await Promise.all(props.fileIdList.map(id => localSync.fetchFile(id)))
            setBlobList(blobList)
        }

    }

    export function AsyncImage({fileName, ...props}: Omit<ImageProps, "src"> & {fileName: string}) {
        const clients = useDBClients()
        const [blob, setBlob] = useState<Blob | null>(null)
        const objectUrl = useObjectURL(blob)

        useEffect(() => {
            loadBlob()
        }, [fileName])

        if(!objectUrl) {
            return <Loading/>
        } else {
            return <AntImage src={objectUrl} {...props}/>
        }

        async function loadBlob() {
            const blob = await clients.query.files.read(fileName)
            setBlob(blob)
        }
    }

}
