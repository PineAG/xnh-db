import { Icons, QuickConfirm } from "@pltk/components"
import { Button } from "antd"

export module ActionWrapperComponents {
    export interface DeleteProps {
        title: string
        description: string
        onDelete: () => void
        children: React.ReactNode
    }
    export function Delete(props: DeleteProps) {
        return <div>
            {props.children}
            <QuickConfirm title={props.title} description={props.description} onConfirm={props.onDelete}>
                <Button
                    style={{position: "absolute", top: 0, right: 0}}
                    icon={<Icons.Close/>}
                    onClick={props.onDelete}
                />
            </QuickConfirm>
        </div>
    }
}