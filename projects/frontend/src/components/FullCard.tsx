import { XNHExportedData } from "@xnh-db/types";

export interface FullCardProps {
    item: XNHExportedData
}

export function FullCard({item}: FullCardProps) {
    return <table>
        <tr>
            <th>标题</th>
            <td>{item.title}</td>
        </tr>
    </table>
}
