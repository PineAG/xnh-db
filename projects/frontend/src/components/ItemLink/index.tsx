import { XNHClasses } from "@xnh-db/types";
import {Button} from 'antd'
import { Link } from "react-router-dom";

export function ItemLink(props: {item: {id: string, type: XNHClasses, title: string}}){
    return <Link to={`/item/${props.item.id}`}>
        <Button type="default">{props.item.title}</Button>
    </Link>
}