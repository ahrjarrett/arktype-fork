import { throwParseError } from "../../../dev/utils/src/errors.js"
import type { evaluate, isAny } from "../../../dev/utils/src/generics.js"
import type { List } from "../../../dev/utils/src/lists.js"
import {
    type Constructor,
    isArray
} from "../../../dev/utils/src/objectKinds.js"
import { stringify } from "../../../dev/utils/src/serialize.js"
import { arrayIndexTypeNode } from "../../nodes/composite/indexed.js"
import { predicateNode } from "../../nodes/composite/predicate.js"
import type { NodeEntry } from "../../nodes/composite/props.js"
import { propsNode } from "../../nodes/composite/props.js"
import type { TypeNode } from "../../nodes/composite/type.js"
import { builtins, typeNode } from "../../nodes/composite/type.js"
import { arrayClassNode } from "../../nodes/primitive/basis/class.js"
import type { extractIn, extractOut, TypeConfig } from "../../type.js"
import type {
    inferDefinition,
    ParseContext,
    validateDefinition
} from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { Prefix } from "../string/reduce/shared.js"
import { writeMissingRightOperandMessage } from "../string/shift/operand/unenclosed.js"
import {
    type InfixOperator,
    type PostfixExpression,
    writeUnsatisfiableExpressionError
} from "./ast.js"
import type { inferIntersection } from "./intersections.js"
import type { Morph, parseMorph } from "./morph.js"
import { parseMorphTuple } from "./morph.js"
import type { inferNarrow, Narrow } from "./narrow.js"
import { parseNarrowTuple } from "./narrow.js"
import type { astToString } from "./utils.js"

export const parseTuple = (def: List, ctx: ParseContext): TypeNode => {
    const tupleExpressionResult = isIndexOneExpression(def)
        ? indexOneParsers[def[1]](def as never, ctx)
        : isIndexZeroExpression(def)
        ? prefixParsers[def[0]](def as never, ctx)
        : undefined
    if (tupleExpressionResult) {
        return tupleExpressionResult.isNever()
            ? throwParseError(
                  writeUnsatisfiableExpressionError(
                      def
                          .map((def) =>
                              typeof def === "string" ? def : stringify(def)
                          )
                          .join(" ")
                  )
              )
            : tupleExpressionResult
    }
    const props: NodeEntry[] = []
    let isVariadic = false
    for (let i = 0; i < def.length; i++) {
        let elementDef = def[i]
        ctx.path.push(`${i}`)
        if (typeof elementDef === "string" && elementDef.startsWith("...")) {
            elementDef = elementDef.slice(3)
            isVariadic = true
        } else if (
            isArray(elementDef) &&
            elementDef.length === 2 &&
            elementDef[0] === "..."
        ) {
            elementDef = elementDef[1]
            isVariadic = true
        }
        const value = parseDefinition(elementDef, ctx)
        if (isVariadic) {
            if (!value.extends(builtins.array())) {
                return throwParseError(writeNonArrayRestMessage(elementDef))
            }
            if (i !== def.length - 1) {
                return throwParseError(prematureRestMessage)
            }
            const elementType = value.getPath(arrayIndexTypeNode())
            props.push({ key: arrayIndexTypeNode(i), value: elementType })
        } else {
            props.push({
                key: {
                    name: `${i}`,
                    prerequisite: false,
                    optional: false
                },
                value
            })
        }
        ctx.path.pop()
    }
    if (!isVariadic) {
        props.push({
            key: {
                name: "length",
                prerequisite: true,
                optional: false
            },
            value: typeNode({ basis: ["===", def.length] })
        })
    }
    const predicate = predicateNode([arrayClassNode(), propsNode(props)])
    return typeNode([predicate])
}

type InfixExpression = [unknown, InfixOperator, ...unknown[]]

export type validateTuple<def extends List, $> = def extends IndexZeroExpression
    ? validatePrefixExpression<def, $>
    : def extends PostfixExpression
    ? validatePostfixExpression<def, $>
    : def extends InfixExpression
    ? validateInfixExpression<def, $>
    : def extends
          | readonly ["", ...unknown[]]
          | readonly [unknown, "", ...unknown[]]
    ? [
          def[0] extends "" ? keyof $ | IndexZeroOperator | Prefix : def[0],
          def[1] extends "" ? keyof $ | IndexOneOperator | Prefix : def[1]
      ]
    : validateTupleLiteral<def, $>

type validateTupleLiteral<
    def extends List,
    $,
    result extends unknown[] = []
> = def extends [infer head, ...infer tail]
    ? validateTupleLiteral<
          tail,
          $,
          [
              ...result,
              head extends variadicExpression<infer operand>
                  ? validateDefinition<operand, $> extends infer syntacticResult
                      ? syntacticResult extends operand
                          ? semanticallyValidateRestElement<
                                operand,
                                $
                            > extends infer semanticResult
                              ? semanticResult extends operand
                                  ? tail extends []
                                      ? head
                                      : prematureRestMessage
                                  : semanticResult
                              : never
                          : syntacticResult
                      : never
                  : validateDefinition<head, $>
          ]
      >
    : result

type semanticallyValidateRestElement<operand, $> = inferDefinition<
    operand,
    $
> extends infer result
    ? result extends never
        ? writeNonArrayRestMessage<operand>
        : isAny<result> extends true
        ? writeNonArrayRestMessage<operand>
        : result extends readonly unknown[]
        ? operand
        : writeNonArrayRestMessage<operand>
    : never

export const writeNonArrayRestMessage = <operand>(operand: operand) =>
    `Rest element ${
        typeof operand === "string" ? `'${operand}'` : ""
    } must be an array` as writeNonArrayRestMessage<operand>

type writeNonArrayRestMessage<operand> = `Rest element ${operand extends string
    ? `'${operand}'`
    : ""} must be an array`

export const prematureRestMessage = `Rest elements are only allowed at the end of a tuple`

type prematureRestMessage = typeof prematureRestMessage

type inferTupleLiteral<
    def extends List,
    $,
    result extends unknown[] = []
> = def extends [infer head, ...infer tail]
    ? inferDefinition<
          head extends variadicExpression<infer operand> ? operand : head,
          $
      > extends infer element
        ? head extends variadicExpression
            ? element extends readonly unknown[]
                ? inferTupleLiteral<tail, $, [...result, ...element]>
                : never
            : inferTupleLiteral<tail, $, [...result, element]>
        : never
    : result

type variadicExpression<operandDef = unknown> =
    | variadicStringExpression<operandDef & string>
    | variadicTupleExpression<operandDef>

type variadicStringExpression<operandDef extends string = string> =
    `...${operandDef}`

type variadicTupleExpression<operandDef = unknown> = ["...", operandDef]

export type inferTuple<def extends List, $> = def extends TupleExpression
    ? inferTupleExpression<def, $>
    : inferTupleLiteral<def, $>

export type inferTupleExpression<
    def extends TupleExpression,
    $
> = def[1] extends "[]"
    ? inferDefinition<def[0], $>[]
    : def[1] extends "&"
    ? inferIntersection<inferDefinition<def[0], $>, inferDefinition<def[2], $>>
    : def[1] extends "|"
    ? inferDefinition<def[0], $> | inferDefinition<def[2], $>
    : def[1] extends "=>"
    ? inferNarrow<inferDefinition<def[0], $>, def[2]>
    : def[1] extends "|>"
    ? parseMorph<def[0], def[2], $>
    : def[1] extends ":"
    ? inferDefinition<def[0], $>
    : def[0] extends "==="
    ? def[1]
    : def[0] extends "instanceof"
    ? def[1] extends Constructor<infer t>
        ? t
        : never
    : def[0] extends "keyof"
    ? inferKeyOfExpression<def[1], $>
    : never

type validatePrefixExpression<
    def extends IndexZeroExpression,
    $
> = def["length"] extends 1
    ? [writeMissingRightOperandMessage<def[0]>]
    : [
          def[0] extends "keyof"
              ? inferDefinition<def, $> extends never
                  ? writeUnsatisfiableExpressionError<astToString<def>>
                  : def[0]
              : def[0],
          def[0] extends "==="
              ? def[1]
              : def[0] extends "instanceof"
              ? Constructor
              : def[0] extends "keyof"
              ? validateDefinition<def[1], $>
              : never
      ]

type validatePostfixExpression<def extends PostfixExpression, $> = [
    validateDefinition<def[0], $>,
    "[]"
]

type validateInfixExpression<
    def extends InfixExpression,
    $
> = def["length"] extends 2
    ? [def[0], writeMissingRightOperandMessage<def[1]>]
    : [
          validateDefinition<def[0], $>,
          def[1] extends "&"
              ? inferDefinition<def, $> extends never
                  ? writeUnsatisfiableExpressionError<"intersection">
                  : def["1"]
              : def[1],
          def[1] extends "|"
              ? validateDefinition<def[2], $>
              : def[1] extends "&"
              ? validateDefinition<def[2], $>
              : def[1] extends "=>"
              ? Narrow<extractIn<inferDefinition<def[0], $>>>
              : def[1] extends "|>"
              ? Morph<extractOut<inferDefinition<def[0], $>>, unknown>
              : validateDefinition<def[2], $>
      ]

export type UnparsedTupleExpressionInput = {
    instanceof: Constructor
    "===": unknown
}

export type UnparsedTupleOperator = evaluate<keyof UnparsedTupleExpressionInput>

export const parseKeyOfTuple: PrefixParser<"keyof"> = (def, ctx) =>
    parseDefinition(def[1], ctx).keyof()

export type inferKeyOfExpression<operandDef, $> = evaluate<
    keyof inferDefinition<operandDef, $>
>

export type ConfigTuple<
    def = unknown,
    config extends TypeConfig = TypeConfig
> = readonly [def, ":", config]

export const parseConfigTuple: PostfixParser<":"> = (def, ctx) =>
    parseDefinition(def[0], ctx)

const parseBranchTuple: PostfixParser<"|" | "&"> = (def, ctx) => {
    if (def[2] === undefined) {
        return throwParseError(writeMissingRightOperandMessage(def[1], ""))
    }
    const l = parseDefinition(def[0], ctx)
    const r = parseDefinition(def[2], ctx)
    return def[1] === "&" ? l.and(r) : l.or(r)
}

const parseArrayTuple: PostfixParser<"[]"> = (def, scope) =>
    parseDefinition(def[0], scope).array()

export type PostfixParser<token extends IndexOneOperator> = (
    def: IndexOneExpression<token>,
    ctx: ParseContext
) => TypeNode

export type PrefixParser<token extends IndexZeroOperator> = (
    def: IndexZeroExpression<token>,
    ctx: ParseContext
) => TypeNode

export type TupleExpression = IndexZeroExpression | IndexOneExpression

export const writeMalformedFunctionalExpressionMessage = (
    operator: FunctionalTupleOperator,
    rightDef: unknown
) =>
    `Expression requires a function following '${operator}' (was ${typeof rightDef})`

export type TupleExpressionOperator = IndexZeroOperator | IndexOneOperator

export type IndexOneOperator = TuplePostfixOperator | TupleInfixOperator

export type TuplePostfixOperator = "[]"

export type TupleInfixOperator = "&" | "|" | "=>" | "|>" | ":"

export type IndexOneExpression<
    token extends IndexOneOperator = IndexOneOperator
> = readonly [unknown, token, ...unknown[]]

const isIndexOneExpression = (def: List): def is IndexOneExpression =>
    indexOneParsers[def[1] as IndexOneOperator] !== undefined

const indexOneParsers: {
    [token in IndexOneOperator]: PostfixParser<token>
} = {
    "|": parseBranchTuple,
    "&": parseBranchTuple,
    "[]": parseArrayTuple,
    "=>": parseNarrowTuple,
    "|>": parseMorphTuple,
    ":": parseConfigTuple
}

export type FunctionalTupleOperator = "=>" | "|>"

export type IndexZeroOperator = "keyof" | "instanceof" | "==="

export type IndexZeroExpression<
    token extends IndexZeroOperator = IndexZeroOperator
> = readonly [token, ...unknown[]]

const prefixParsers: {
    [token in IndexZeroOperator]: PrefixParser<token>
} = {
    keyof: parseKeyOfTuple,
    instanceof: (def) => {
        if (typeof def[1] !== "function") {
            return throwParseError(
                `Expected a constructor following 'instanceof' operator (was ${typeof def[1]}).`
            )
        }
        return typeNode({
            basis: def[1] as Constructor
        })
    },
    "===": (def) => typeNode({ basis: ["===", def[1]] })
}

const isIndexZeroExpression = (def: List): def is IndexZeroExpression =>
    prefixParsers[def[0] as IndexZeroOperator] !== undefined
