import { describe, it } from "mocha"
import { attest } from "../dev/attest/main.ts"
import type { Type } from "../src/main.ts"
import { type } from "../src/main.ts"
import type { inferred } from "../src/parse/definition.ts"

describe("cast", () => {
    it("primitive", () => {
        attest(type("string" as inferred<"foo">)).typed as Type<"foo">
    })
    it("object", () => {
        // definitions that are cast can't be validated
        attest(type({ a: "string" } as inferred<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    it("primitive to object", () => {
        attest(type("string" as inferred<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    it("object to primitive", () => {
        attest(type({ a: "string" } as inferred<"foo">)).typed as Type<"foo">
    })
})