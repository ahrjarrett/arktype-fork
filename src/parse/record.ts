import type { Dict } from "../../dev/utils/src/records.js"
import type { evaluate } from "../../dev/utils/src/generics.js"
import type { NamedPropRule } from "../nodes/composite/named.js"
import { predicateNode } from "../nodes/composite/predicate.js"
import { propsNode } from "../nodes/composite/props.js"
import { typeNode } from "../nodes/composite/type.js"
import { domainNode } from "../nodes/primitive/basis/domain.js"
import type { inferDefinition, ParseContext } from "./definition.js"
import { parseDefinition } from "./definition.js"
import { Scanner } from "./string/shift/scanner.js"

export const parseRecord = (def: Dict, ctx: ParseContext) => {
    const named: NamedPropRule[] = []
    for (const definitionKey in def) {
        let keyName = definitionKey
        let optional = false
        if (definitionKey[definitionKey.length - 1] === "?") {
            if (
                definitionKey[definitionKey.length - 2] === Scanner.escapeToken
            ) {
                keyName = `${definitionKey.slice(0, -2)}?`
            } else {
                keyName = definitionKey.slice(0, -1)
                optional = true
            }
        }
        ctx.path.push(keyName)
        named.push({
            key: {
                name: keyName,
                prerequisite: false,
                optional
            },
            value: parseDefinition(def[definitionKey], ctx)
        })
        ctx.path.pop()
    }
    const props = propsNode(named)
    const predicate = predicateNode([objectBasisNode, props])
    return typeNode([predicate])
}

const objectBasisNode = domainNode("object")

type withPossiblePreviousEscapeCharacter<k> = k extends `${infer name}?`
    ? `${name}${Scanner.EscapeToken}?`
    : k

export type inferRecord<def extends Dict, $> = evaluate<
    {
        [requiredKeyName in requiredKeyOf<def>]: inferDefinition<
            def[withPossiblePreviousEscapeCharacter<requiredKeyName>],
            $
        >
    } & {
        [optionalKeyName in optionalKeyOf<def>]?: inferDefinition<
            def[`${optionalKeyName}?`],
            $
        >
    }
>

type KeyParseResult<name extends string, isOptional extends boolean> = [
    name,
    isOptional
]

type parseKey<k> = k extends optionalKeyWithName<infer name>
    ? name extends `${infer baseName}${Scanner.EscapeToken}`
        ? [`${baseName}?`, false]
        : [name, true]
    : [k, false]

type optionalKeyWithName<name extends string = string> = `${name}?`

type optionalKeyOf<def> = {
    [k in keyof def]: parseKey<k> extends KeyParseResult<infer name, true>
        ? name
        : never
}[keyof def] &
    // ensure keyof is fully evaluated for inferred types
    unknown

type requiredKeyOf<def> = {
    [k in keyof def]: parseKey<k> extends KeyParseResult<infer name, false>
        ? name
        : never
}[keyof def] &
    unknown
