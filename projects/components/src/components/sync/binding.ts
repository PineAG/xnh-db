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
}
