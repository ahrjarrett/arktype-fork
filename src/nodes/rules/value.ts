import { hasDomain } from "../../utils/domains.ts"
import type { SerializablePrimitive } from "../../utils/serialize.ts"
import { serializePrimitive, stringify } from "../../utils/serialize.ts"
import type { Compilation } from "../compile.ts"
import { defineProblemConfig } from "../problems.ts"
import { registerValue } from "../registry.ts"

export const compileValueCheck = (value: unknown, c: Compilation) => {
    if (hasDomain(value, "object") || typeof value === "symbol") {
        return c.check(
            "value",
            `data === ${registerValue(
                `${c.type.name}${c.path.length ? "_" + c.path.join("_") : ""}`,
                value
            )}`,
            value
        )
    }
    return c.check(
        "value",
        `data === ${serializePrimitive(value as SerializablePrimitive)}`,
        value as {}
    )
}

export const valueProblemConfig = defineProblemConfig("value", {
    mustBe: stringify
})
