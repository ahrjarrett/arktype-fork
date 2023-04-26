import { CompilationState } from "./nodes/node.js"
import type { CheckResult } from "./nodes/traverse.js"
import { TraversalState } from "./nodes/traverse.js"
import type { TypeNode } from "./nodes/type.js"
import { In } from "./nodes/utils.js"
import type { Filter, inferPredicate } from "./parse/ast/filter.js"
import type { inferIntersection } from "./parse/ast/intersection.js"
import type { Morph, ParsedMorph } from "./parse/ast/morph.js"
import type { inferUnion } from "./parse/ast/union.js"
import {
    as,
    type inferDefinition,
    parseDefinition,
    type validateDefinition
} from "./parse/definition.js"
import type { bind, Scope } from "./scope.js"
import type { Ark } from "./scopes/ark.js"
import type { evaluate } from "./utils/generics.js"
import { CompiledFunction } from "./utils/generics.js"
import type { BuiltinClass } from "./utils/objectKinds.js"
import { Path } from "./utils/paths.js"
import { registry } from "./utils/registry.js"

export type TypeParser<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <def>(def: validateDefinition<def, bind<$, def>>): parseType<
        def,
        bind<$, def>
    >

    <def>(
        def: validateDefinition<def, bind<$, def>>,
        opts: TypeOptions
    ): parseType<def, bind<$, def>>
}

// Reuse the validation result to determine if the type will be successfully created.
// If it will, infer it and create a validator. Otherwise, return never.
export type parseType<def, $ extends { this: unknown }> = [def] extends [
    validateDefinition<def, $>
]
    ? Type<$["this"]>
    : never

// TODO: needed?
registry().register("state", TraversalState)

export class Type<t = unknown, $ = Ark> extends CompiledFunction<
    (data: unknown) => CheckResult<inferOut<t>>
> {
    declare [as]: t
    declare infer: inferOut<t>
    declare inferIn: inferIn<t>

    root: TypeNode<t>
    allows: this["root"]["allows"]

    constructor(public definition: unknown, public scope: Scope) {
        const root = parseDefinition(definition, {
            path: new Path(),
            scope
        }) as TypeNode<t>
        super(
            In,
            `const state = new ${registry().reference("state")}();
        ${root.compileTraverse(new CompilationState())}
        return state.finalize(${In});`
        )
        this.root = root
        this.allows = root.allows
    }

    #unary(def: unknown, operation: "and" | "or"): Type<any> {
        const other = parseDefinition(def, {
            path: new Path(),
            scope: this.scope
        })
        return new Type(this.root[operation](other), this.scope)
    }

    and<def>(
        def: validateDefinition<def, $>
    ): Type<inferIntersection<t, inferDefinition<def, $>>, $> {
        return this.#unary(def, "and")
    }

    or<def>(
        def: validateDefinition<def, $>
    ): Type<inferUnion<t, inferDefinition<def, $>>, $> {
        return this.#unary(def, "or")
    }

    morph<transform extends Morph<inferIn<t>>>(
        transform: transform
    ): Type<(In: inferOut<t>) => ReturnType<transform>, $> {
        return this as any
    }

    extends(other: Type) {
        return this.root.intersect(other.root) === this.root
    }

    // TODO: based on below, should maybe filter morph output if used after
    filter<predicate extends Filter<inferIn<t>>>(
        predicate: predicate
    ): Type<inferIntersection<t, inferPredicate<inferIn<t>, predicate>>, $> {
        return new Type(this.root.constrain("filter", predicate), this.scope)
    }

    // TODO: how should ordering work with morphs? if morphs then array, it should be array of morphs?
    // so order does matter.
    toArray(): Type<t[], $> {
        return new Type(this.root.toArray(), this.scope)
    }

    assert(data: unknown): inferOut<t> {
        const result = this.call(null, data)
        return result.problems ? result.problems.throw() : result.data
    }
}

export type KeyCheckKind = "loose" | "strict" | "distilled"

export type TypeOptions = evaluate<{
    keys?: KeyCheckKind
    mustBe?: string
}>

export type TypeConfig = TypeOptions

export type inferIn<t> = inferMorphs<t, "in">

export type inferOut<t> = inferMorphs<t, "out">

type inferMorphs<t, io extends "in" | "out"> = t extends ParsedMorph<
    infer i,
    infer o
>
    ? io extends "in"
        ? i
        : o
    : t extends object
    ? t extends BuiltinClass | ((...args: any[]) => any)
        ? t
        : { [k in keyof t]: inferMorphs<t[k], io> }
    : t