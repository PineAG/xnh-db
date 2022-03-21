import { XNHExportedData } from "@xnh-db/types";
import { Link } from "react-router-dom";
import {Card, Skeleton, Avatar} from 'antd'
import { useEffect, useState } from "react";
import { LoadingStatusBase } from "../utils/status";
import { getItem } from "../actions/api";

export interface PreviewCardProps {
    itemId: string
}

export function PreviewCard({itemId}: PreviewCardProps) {
    const [status, setStatus] = useState<LoadingStatusBase<XNHExportedData>|{status: 'empty'}>({status: 'pending'})
    useEffect(() => {
        setStatus({status: 'pending'})
        getItem(itemId).then(data => {
            if(data){
                setStatus({status: 'success', data})
            }else{
                setStatus({status: 'empty'})
            }
        })
    }, [itemId])
    
    if(status.status === 'pending'){
        return <Skeleton loading avatar active />
    }else if(status.status === 'success'){
        const data = status.data
        return <Link to={`/item/${itemId}`}>
            <Card>
                <Card.Meta
                    title={data.title}
                    avatar={<Avatar size="large" src={ data.avatar ? `/data${data.avatar}` : null}/>}
                />
            </Card>
        </Link>
    }else{
        return <Card>
                <Card.Meta title="加载失败"/>
            </Card>
    }
    
}
