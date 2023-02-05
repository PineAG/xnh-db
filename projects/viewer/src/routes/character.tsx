import {useNavigate, useParams} from "react-router"
import { DBSearchInput, DBSearchResultList, CharacterItemViewer, Flex, CharacterItemEditor } from "@xnh-db/components";
import { Card, Empty } from "antd";
import { Link } from "react-router-dom";

export function CharacterSearch() {
    const navigate = useNavigate()
    return <Card>
        <DBSearchInput collection="character"/>
        <DBSearchResultList onItemOpen={id => navigate(`/character/view/${id}`)} collection="character"/>
    </Card>
}

export function CharacterViewer() {
    const {id} = useParams()
    if(!id) {
        return <Empty/>
    }
    return <Flex direction="vertical">
        <Link to={`/character/edit/${id}`}>编辑</Link>
        <CharacterItemViewer id={id}/>
    </Flex>
}

export function CharacterEditor() {
    const navigate = useNavigate()
    const {id} = useParams()
    if(!id) {
        return <Empty/>
    }
    return <>
        <CharacterItemEditor id={id} onUpdate={gotoView}/>
    </>

    function gotoView() {
        navigate(`/character/view/${id}`)
    }
}