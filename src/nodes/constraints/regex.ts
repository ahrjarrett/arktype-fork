import { In } from "../../compile/compile.js"
import { intersectUniqueLists, listFrom } from "../../utils/lists.js"
import type { Node } from "../node.js"
import { defineNodeKind } from "../node.js"

export type RegexNode = Node<{
    kind: "regex"
    rule: string[]
    intersected: RegexNode
}>

export const RegexNode = defineNodeKind<RegexNode, string | string[]>({
    kind: "regex",
    parse: listFrom,
    compile: (rule) => {
        const subconditions = rule.sort().map(compileExpression)
        return subconditions.join(" && ")
    },
    intersect: (l, r): RegexNode =>
        RegexNode(intersectUniqueLists(l.rule, r.rule)),
    props: (base) => {
        const literals = base.rule.map((_) => `/${_}/`)
        const description =
            literals.length === 1
                ? literals[0]
                : `expressions ${literals.join(", ")}`
        return { description }
    }
})

const compileExpression = (source: string) => {
    return `${In}.match(/${source}/)`
}

// return this.children
// .map((source) =>
//     s.ifNotThen(
//         RegexNode.compileExpression(source),
//         s.problem("regex", source)
//     )
// )
// .join("\n")
