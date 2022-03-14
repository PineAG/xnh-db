import { XNHExportedData } from "@xnh-db/types";
import React, { useEffect, useState } from "react";
import { getRandomItems } from "../actions/api";
import { PreviewCard } from "../components/PreviewCard";
import { LoadingStatusBase } from "../utils/status";

type HomeStatus = LoadingStatusBase<XNHExportedData[]>

export function Home() {
    const [status, setStatus] = useState<HomeStatus>({status: 'pending'})
    useEffect(() => {
        getRandomItems(10)
            .then(data => setStatus({status: 'success', data}))
            .catch(err => setStatus({status: 'failed', message: err.toString()}))
    }, [])
    if(status.status === 'pending'){
        return <p>Loading ... </p>
    } else if (status.status === 'failed') {
        return <p>Error: {status.message}</p>
    } else {
        return <div>
            {status.data.map(it =>
                <PreviewCard item={it} /> 
                )}
        </div>
    }
}