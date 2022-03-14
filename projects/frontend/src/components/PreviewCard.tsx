import { XNHExportedData } from "@xnh-db/types";
import { Link } from "react-router-dom";

export interface PreviewCardProps {
    item: XNHExportedData
}

export function PreviewCard({item}: PreviewCardProps) {
    return <div>
        <p>
            <Link to={`/item/${item.id}`}>{item.title}</Link>
        </p>
    </div>
}
