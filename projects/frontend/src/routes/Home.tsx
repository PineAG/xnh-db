import React, { useEffect, useState } from "react";
import { getRandomItemId } from "../actions/api";
import { PreviewCard } from "../components/PreviewCard";
import { LoadingStatusBase } from "../utils/status";
import {Row, Col} from 'antd'

type HomeStatus = LoadingStatusBase<string[]>

export function Home() {
    const [status, setStatus] = useState<HomeStatus>({status: 'pending'})
    useEffect(() => {
        getRandomItemId(10)
            .then(data => setStatus({status: 'success', data}))
            .catch(err => setStatus({status: 'failed', message: err.toString()}))
    }, [])
    if(status.status === 'pending'){
        return <p>Loading ... </p>
    } else if (status.status === 'failed') {
        return <p>Error: {status.message}</p>
    } else {
        return <Row>
            {status.data.map(id =>
                <Col xs={24} sm={12} md={8} lg={6} key={id}>
                    <PreviewCard itemId={id} />
                </Col> 
            )}
        </Row>
    }
}