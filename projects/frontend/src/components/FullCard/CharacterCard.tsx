import {Row, Col} from 'antd'
import { CharacterExport } from "@xnh-db/types";
import { CardComponent, NullableImage, PropsTable, PropsTableDataSource } from "./utils";
import { ItemLink } from '../ItemLink';

export const CharacterCard: CardComponent<CharacterExport> = ({item}) => {
    const propsTable: PropsTableDataSource = [
        ['姓名', item.props.姓名, 2],
        ['变种', item.props.变种, 2],
        ['配音', item.rel.配音.map(it => <ItemLink key={it.id} item={it}/>), 4],
        ['出处', item.rel.出处.map(it => <ItemLink key={it.id} item={it}/>), 2],
        ['作者', item.rel.创作者.map(it => <ItemLink key={it.id} item={it}/>), 2]
    ]
    return <Row>
        <Col xs={24} sm={12} md={8} style={{placeItems: 'center'}}>
            <NullableImage
                style={{maxWidth: '100%'}} 
                src={item.files.立绘}/>
        </Col>
        <Col xs={24} sm={12} md={16}>
            <PropsTable title={item.title} items={propsTable} column={4}/>
        </Col>
    </Row>
}