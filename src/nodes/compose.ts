import type { Type } from "../scopes/type.ts"
import type { Domain } from "../utils/domains.ts"
import type { constructor, Dict, extend, mutable } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { BranchNode, RuleSet } from "./branch.ts"
import type { Compilation } from "./compile.ts"
import type { Range } from "./rules/range.ts"
import type { LiteralRules, NarrowableRules } from "./rules/rules.ts"

export type IntersectionResult<t> =
    | {
          result: t
          isSubtype: boolean
          isSupertype: boolean
          isDisjoint: false
      }
    | {
          result: DisjointContext
          isSubtype: false
          isSupertype: false
          isDisjoint: true
      }

export type DisjointKinds = extend<
    Record<string, { l: unknown; r: unknown }>,
    {
        domain: {
            l: Domain
            r: Domain
        }
        range: {
            l: Range
            r: Range
        }
        tupleLength: {
            l: number
            r: number
        }
        class: {
            l: constructor
            r: constructor
        }
        value: {
            l: unknown
            r: unknown
        }
        leftAssignability: {
            l: unknown
            r: BranchNode
        }
        rightAssignability: {
            l: BranchNode
            r: unknown
        }
        union: {
            l: BranchNode[]
            r: BranchNode[]
        }
    }
>

export const disjointDescriptionWriters = {
    domain: ({ l, r }) => `${l.join(", ")} and ${r.join(", ")}`,
    range: ({ l, r }) => `${stringifyRange(l)} and ${stringifyRange(r)}`,
    class: ({ l, r }) =>
        `classes ${typeof l === "string" ? l : l.name} and ${
            typeof r === "string" ? r : r.name
        }`,
    tupleLength: ({ l, r }) => `tuples of length ${l} and ${r}`,
    value: ({ l, r }) => `literal values ${stringify(l)} and ${stringify(r)}`,
    leftAssignability: ({ l, r }) =>
        `literal value ${stringify(l.value)} and ${stringify(r)}`,
    rightAssignability: ({ l, r }) =>
        `literal value ${stringify(r.value)} and ${stringify(l)}`,
    union: ({ l, r }) => `branches ${stringify(l)} and branches ${stringify(r)}`
} satisfies {
    [k in DisjointKind]: (context: DisjointContext<k>) => string
}

export const stringifyRange = (range: Range) =>
    "limit" in range
        ? `the range of exactly ${range.limit}`
        : range.min
        ? range.max
            ? `the range bounded by ${range.min.comparator}${range.min.limit} and ${range.max.comparator}${range.max.limit}`
            : `${range.min.comparator}${range.min.limit}`
        : range.max
        ? `${range.max.comparator}${range.max.limit}`
        : "the unbounded range"

export type DisjointKind = keyof DisjointKinds

export class IntersectionState {
    path = new Path()
    disjointsByPath: DisjointsByPath = {}

    constructor(public type: Type, public lastOperator: "|" | "&") {}

    disjoint<kind extends DisjointKind>(
        kind: kind,
        l: DisjointKinds[kind]["l"],
        r: DisjointKinds[kind]["r"]
    ) {
        const result = { kind, l, r }
        this.disjointsByPath[`${this.path}`] = result
        return {
            result,
            isSubtype: false,
            isSupertype: false,
            isDisjoint: true
        } satisfies IntersectionResult<never>
    }

    equality<result>(result: result) {
        return {
            result,
            isSubtype: true,
            isSupertype: true,
            isDisjoint: false
        } satisfies IntersectionResult<result>
    }

    subtype<result>(result: result) {
        return {
            result,
            isSubtype: true,
            isSupertype: false,
            isDisjoint: false
        } satisfies IntersectionResult<result>
    }

    supertype<result>(result: result) {
        return {
            result,
            isSubtype: false,
            isSupertype: true,
            isDisjoint: false
        } satisfies IntersectionResult<result>
    }
}

export type DisjointsByPath = Record<string, DisjointContext>

export type DisjointContext<kind extends DisjointKind = DisjointKind> = {
    kind: kind
} & DisjointKinds[kind]
