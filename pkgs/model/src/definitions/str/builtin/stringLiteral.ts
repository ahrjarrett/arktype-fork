import { typeDefProxy, validationError, createParser } from "./internal.js"
import { Literal } from "./literal.js"

export namespace StringLiteral {
    // Double quotes are also supported, but are automatically replaced by single quotes before validation
    export type Definition<Text extends string = string> =
        | `'${Text}'`
        | `"${Text}"`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Literal.parse
        },
        {
            matches: (def) => !!def.match(`^('.*')|(".*")$`),
            allows: ({ def, ctx: { path } }, valueType) =>
                def === valueType
                    ? {}
                    : validationError({ def, valueType, path }),
            generate: ({ def }) => def.slice(1, -1)
        }
    )

    export const delegate = parse as any as Definition
}