import { In } from "../../compile/compile.js"
import type { Domain } from "../../utils/domains.js"
import { getBaseDomainKeys } from "../../utils/objectKinds.js"
import { defineNodeKind } from "../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export type DomainNode = BasisNode<{ kind: "domain"; rule: Domain }>

export const DomainNode = defineNodeKind<DomainNode>({
    kind: "domain",
    compile: (rule) =>
        rule === "object"
            ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
            : `typeof ${In} === "${rule}"`,
    props: (base) => ({
        domain: base.rule,
        literalKeys: getBaseDomainKeys(base.rule),
        description: base.rule
    }),
    intersect: intersectBases
})

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
