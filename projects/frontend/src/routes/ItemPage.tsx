import { XNHExportedData } from "@xnh-db/types"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getItem } from "../actions/api"
import { FullCard } from "../components/FullCard"
import { LoadingStatusBase } from "../utils/status"

type ItemPageStatus = LoadingStatusBase<XNHExportedData> | {status: 'not_found'}

export function ItemPage() {
    const {itemId} = useParams<{itemId: string}>()
    const [status, setStatus] = useState<ItemPageStatus>({status: 'pending'})
    useEffect(() => {
        console.log(itemId)
        if(!itemId){
            setStatus({status: 'not_found'})
            return
        }
        getItem(itemId)
        .then(data => 
            setStatus(data === null ? 
                {status: 'not_found'} : 
                {status: 'success', data}))
        .catch(err => setStatus({status: 'failed', message: err.toString()}))
    }, [itemId])

    if(status.status === 'pending'){
        return <div>Loading...</div>
    }else if(status.status === 'failed'){
        return <div>Error: {status.message}</div>
    }else if(status.status === 'not_found'){
        return <div>Page Not Found</div>
    }else{
        return <FullCard item={status.data}/>
    }
}