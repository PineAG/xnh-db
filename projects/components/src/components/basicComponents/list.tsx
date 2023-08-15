import { action, computed, makeAutoObservable, observable } from "mobx"
import { Observer, useLocalObservable } from "mobx-react-lite"
import { createContext, useContext, useEffect, useRef, useState } from "react"

export module BasicListComponents {
    export module DraggableList {
        interface DraggableWrapperProps {
            index: number
            children: React.ReactNode
        }
        
        export function DraggableWrapper(props: DraggableWrapperProps) {
            const store = useStore()
            const id = useComponentId({
                onInit: id => {store.registerDraggableWrapper(id, props.index)},
                onRevoked: id => store.revokeDraggableWrapper(id)
            })
            return <Observer>{() => (
                <DraggableWrapperIdContext.Provider value={id}>
                    {props.children}
                </DraggableWrapperIdContext.Provider>
            )}</Observer>
        }

        interface DraggableZoneProps {
            style?: React.CSSProperties
            children?: (selected: boolean, index: number) => React.ReactNode 
        }

        export function DraggableZone(props: DraggableZoneProps) {
            const store = useStore()
            const [ref, bounds] = useBoundingRef<HTMLDivElement>()
            const id = useComponentId({
                onInit: id => {store.registerDraggableZone(id, bounds)},
                onRevoked: id => store.revokeDraggableZone(id)
            })

            useEffect(() => {
                store.registerDraggableZone(id, bounds)
            }, bounds)

            const zoneId = useDraggableWrapperId()

            return <Observer>{() => (
                <div ref={ref}>{
                    props.children?.call(
                        null,
                        store.isDragging(id),
                        store.getIndexByWrapperId(zoneId)
                    )
                }</div>
            )}</Observer>
        }
        
        interface DroppableZoneProps {
            index: number
            children: (selected: boolean) => React.ReactNode 
        }

        export function DroppableZone(props: DroppableZoneProps) {
            const store = useStore()
            const id = useComponentId({
                onInit: id => {
                    store.registerDroppableZone(id, props.index, bounds)
                },
                onRevoked: id => {
                    store.revokeDroppableZone(id)
                }
            })

            useEffect(() => {
                store.registerDroppableZone(id, props.index, bounds)
            }, [props.index])
            
            return <Observer>{() => (
                <div>
                    {props.children(store.isNearest(id))}
                </div>
            )}</Observer>
        }

        interface ProviderProps<T> extends ListRef<T> {
            children: React.ReactNode
        }

        export function DnDProvider<T>(props: ProviderProps<T>) {
            const store = useLocalObservable(() => new Store())
            useEffect(() => {
                store.updateRef(props.items, props.onChange)
            }, [props.items, props.onChange])

            return <StoreContext.Provider value={store}>
                {props.children}
            </StoreContext.Provider>
        }

        interface ListRef<T> {
            items: T[]
            onChange: (items: T[], indices?: number[]) => void
        }

        type Bounds = [number, number, number, number]

        class Store {
            @observable listRef: ListRef<any> = {items: [], onChange: () => {}}
            @observable elementCounter: number = 0
            @observable selectedDraggableZoneId: null | number = null
            @observable nearestDroppableZoneId: null | number = null
            @observable draggableWrappers: Map<number, {index: number}> = observable.map()
            @observable draggableZones: Map<number, {bounds: Bounds}> = observable.map()
            @observable droppableZones: Map<number, {index: number, bounds: Bounds}> = observable.map()

            constructor() {
                makeAutoObservable(this)
            }

            @action updateRef(items: ListRef<any>["items"], onChange: ListRef<any>["onChange"]) {
                this.listRef = {items, onChange}
                this.clear()
            }

            @action newId(): number {
                return this.elementCounter++
            }

            @computed isNearest(id: number): boolean {
                return id === this.nearestDroppableZoneId
            }

            @computed isDragging(id: number): boolean {
                return id === this.selectedDraggableZoneId
            }

            @computed getIndexByWrapperId(id: number): number {
                throw new Error()
            }

            @action insert(fromIndex: number, toIndex: number) {

            }

            @action clear() {
                this.selectedDraggableZoneId = null
                this.nearestDroppableZoneId = null
            }

            @action registerDraggableWrapper(id: number, index: number) {
                throw new Error()
            }

            @action revokeDraggableWrapper(id: number) {
                this.clear()
            }

            @action registerDraggableZone(id: number, bounds: Bounds) {
                throw new Error()
            }

            @action revokeDraggableZone(id: number) {
                this.clear()
            }

            @action registerDroppableZone(id: number, index: number, bounds: Bounds) {
                throw new Error()
            }

            @action revokeDroppableZone(id: number) {
                this.clear()
            }
        }

        const StoreContext = createContext<Store | null>(null)
        const DraggableWrapperIdContext = createContext<number | null>(null)

        function useStore(): Store {
            const store = useContext(StoreContext)
            if(!store) {
                throw new Error(`Not in DnD Provider`)
            }
            return store
        }

        function useDraggableWrapperId(): number {
            const id = useContext(DraggableWrapperIdContext)
            if(id == null) {
                throw new Error(`Not in a DraggableWrapper`)
            }
            return id
        }

        interface UseComponentIdProps {
            onInit: (id: number) => void
            onRevoked: (id: number) => void
        }

        function useComponentId(props: UseComponentIdProps): number {
            const store = useStore()
            const [id, setId] = useState<number | null>(null)
            useEffect(() => {
                const newId = store.newId()
                setId(newId)
                props.onInit(newId)
                return () => props.onRevoked(newId)
            }, [])
            if(id == null) {
                throw new Error("Invalid state")
            }
            return id
        }

        function useBoundingRef<T extends HTMLElement>(): [React.LegacyRef<T>, [number, number, number, number]] {
            const ref = useRef<T>(null)
            const rect = expandRect(ref.current?.getBoundingClientRect())
            
            return [ref, rect]

            function expandRect(rect: undefined | DOMRect): [number, number, number, number] {
                if(!rect) {
                    return [0, 0, 0, 0]
                } else {
                    return [rect.x, rect.y, rect.width, rect.height]
                }
            }
        }
    }
}