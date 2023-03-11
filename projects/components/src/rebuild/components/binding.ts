import { useState } from "react"
import { DeepPartial } from "utility-types"

export module XBinding {
    export interface Binding<T> {
        value: T
        update(value: T): void
    }

    export function useBinding<T>(initialValue: T): Binding<T> {
        const [value, update] = useState(initialValue)
        return {value, update}
    }

    export function removeProperty<T extends Record<string, any>, K extends keyof T>(binding: Binding<T | Omit<T, K>>, key: K) {
        const newObject: Partial<Omit<T, K>> = {}
        const oldObject = binding.value
        for(const k in oldObject) {
            if(k !== key) {
                newObject[k] = oldObject[k]
            }
        }
        binding.update(newObject as Omit<T, K>)
    }

    export class PropertyBinding<T, K extends keyof T> implements Binding<T[K]> {
        constructor(private parent: Binding<T>, private key: K) {
        }

        get value(): T[K] {
            return this.parent.value[this.key]
        }

        update(value: T[K]) {
            const parent = this.parent.value
            this.parent.update({
                ...parent,
                [this.key]: value
            })
        }

        join<NextK extends keyof T[K]>(key: NextK): PropertyBinding<T[K], NextK> {
            return new PropertyBinding(this, key)
        }
    }

    export function propertyOf<T>(binding: Binding<T>): {join<K extends keyof T>(key: K): PropertyBinding<T, K>} {
        return {
            join: (key) => new PropertyBinding(binding, key)
        }
    }

    export class PartialPropertyBinding<T, K extends keyof T> implements Binding<DeepPartial<T[K]> | undefined> {
        constructor(private parent: Binding<DeepPartial<T> | {} | undefined>, private key: K) {
        }

        get value(): DeepPartial<T[K]> | undefined {
            const parent = this.parent.value
            if(parent === undefined || parent === null) {
                return undefined
            } else {
                return parent[this.key as string]
            }
        }

        update(value: DeepPartial<T[K]> | undefined) {
            const parent = this.parent.value
            this.parent.update({
                ...parent,
                [this.key]: value
            })
        }

        join<NextK extends keyof T[K]>(key: NextK): PartialPropertyBinding<T[K], NextK> {
            return new PartialPropertyBinding<T[K], NextK>(this, key)
        }
    }

    export function partialPropertyOf<T>(binding: Binding<DeepPartial<T>>): {join<K extends keyof T>(key: K): PartialPropertyBinding<T, K>} {
        return {
            join: (key) => new PartialPropertyBinding(binding, key)
        }
    }

    class ArrayItemBinding<T> implements Binding<T> {
        constructor(private parent: Binding<T[]>, private index: number) {}
        
        get value(): T {
            return this.parent.value[this.index]
        }
        
        update(value: T): void {
            const newArray = Array.from(this.parent.value)
            newArray[this.index] = value
            this.parent.update(newArray)
        }

        remove() {
            const newArray = Array.from(this.parent.value)
            newArray.splice(this.index, 1)
            this.parent.update(newArray)
        }
    }

    export function fromArray<T>(binding: Binding<T[]>): ArrayItemBinding<T>[] {
        return binding.value.map((v, i) => new ArrayItemBinding(binding, i))
    }

    export function defaultValue<T>(binding: Binding<T | undefined | null>, defaultFactory: () => T): Binding<T> {
        return {
            get value() {
                return binding.value === null || binding.value === undefined ? defaultFactory() : binding.value
            },
            update: value => binding.update(value)
        }
    }
}
