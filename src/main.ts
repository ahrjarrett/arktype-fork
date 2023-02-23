export { scope } from "./scopes/scope.ts"
export { type, ark, arkscope } from "./scopes/ark.ts"
export {
    intersection,
    union,
    arrayOf,
    instanceOf,
    valueOf,
    morph,
    narrow,
    keyOf
} from "./scopes/expressions.ts"
export type { Scope, Space } from "./scopes/scope.ts"
export type { Type } from "./scopes/type.ts"
export { Problems, Problem } from "./traverse/problems.ts"