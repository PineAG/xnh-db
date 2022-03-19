import {Row, Col, Image} from 'antd'
import { CharacterExport } from "@xnh-db/types";
import { CardComponent, NullableImage } from "./utils";

export const CharacterCard: CardComponent<CharacterExport> = ({item}) => {
    console.log(item.files.立绘)
    return <Row>
        <Col xs={8} style={{placeItems: 'center'}}>
            <NullableImage
                style={{aspectRatio: '1/2', maxWidth: '100%'}} 
                src={item.files.立绘}/>
        </Col>
        <Col xs={16}>
            <Row>
                <Col xs={4}>姓名</Col>
                <Col xs={20}>{item.props.姓名}</Col>
            </Row>
        </Col>
    </Row>
}