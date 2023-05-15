import type { abstractableConstructor } from "../../utils/objectKinds.js"
import {
    getExactBuiltinConstructorName,
    prototypeKeysOf
} from "../../utils/objectKinds.js"
import type { CompilationState } from "../compilation.js"
import { In } from "../compilation.js"
import { registry } from "../registry.js"
import { BasisNode } from "./basis.js"

export class ClassNode extends BasisNode<"class"> {
    readonly domain = "object"
    declare children: [abstractableConstructor]

    constructor(public child: abstractableConstructor) {
        super("class", ClassNode.compile(child))
        if (!this.child) {
            // TODO: clean?
            this.children = [child]
        }
    }

    static compile(child: abstractableConstructor) {
        return `${In} instanceof ${
            getExactBuiltinConstructorName(child) ??
            registry().register(child.name, child)
        }`
    }

    toString() {
        return this.child.name
    }

    literalKeysOf() {
        return prototypeKeysOf(this.child.prototype)
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.condition, s.problem("class", this.child))
    }
}