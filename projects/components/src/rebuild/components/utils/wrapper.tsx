import { DbContexts } from "../context"

export module ActionWrapperComponents {
    export interface DeleteProps {
        title: string
        description: string
        onDelete: () => void
        children: React.ReactNode
    }
    export function Delete(props: DeleteProps) {
        const {Button, QuickConfirm} = DbContexts.useComponents()

        return <div>
            {props.children}
            <QuickConfirm title={props.title} description={props.description} onConfirm={props.onDelete}>
                <Button
                    style={{position: "absolute", top: 0, right: 0}}
                    icon="close"
                    type="primary"
                    onClick={props.onDelete}
                />
            </QuickConfirm>
        </div>
    }
}