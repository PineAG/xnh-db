import { DBinding } from "@pltk/components"
import { useState } from "react"

export module XBinding {
    export interface Binding<T> {
        value: T
        update(value: T): void
    }

    export function useBinding<T>(initialValue: T): Binding<T> {
        const [value, update] = useState(initialValue)
        return {value, update}
    }

    class PropertyBinding<T, K extends keyof T> implements Binding<T[K]> {
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

    export function toDBinding<T>(binding: Binding<T>): DBinding<T> {
        return {
            value: binding.value,
            async update(value) {
                binding.update(value)
            }
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
