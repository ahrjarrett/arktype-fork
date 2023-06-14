import type { ProblemCode } from "./compile/problems.js"
import type { TypeNode } from "./main.js"
import { builtins } from "./nodes/composite/type.js"
import type {
    inferDefinition,
    Inferred,
    validateDefinition
} from "./parse/definition.js"
import {
    parseObject,
    writeBadDefinitionTypeMessage
} from "./parse/definition.js"
import type {
    GenericDeclaration,
    GenericParamsParseError,
    parseGenericParams
} from "./parse/generic.js"
import { parseString } from "./parse/string/string.js"
import type {
    DeclarationParser,
    DefinitionParser,
    extractIn,
    extractOut,
    Generic,
    GenericProps,
    KeyCheckKind,
    TypeConfig,
    TypeParser
} from "./type.js"
import { createTypeParser, Type } from "./type.js"
import { domainOf } from "./utils/domains.js"
import { throwParseError } from "./utils/errors.js"
import type { evaluate, nominal } from "./utils/generics.js"
import { Path } from "./utils/lists.js"
import type { Dict } from "./utils/records.js"

export type ScopeParser<parent, ambient> = {
    <aliases>(aliases: validateAliases<aliases, parent & ambient>): Scope<{
        exports: inferBootstrapped<{
            exports: bootstrapExports<aliases>
            locals: bootstrapLocals<aliases> & parent
            ambient: ambient
        }>
        locals: inferBootstrapped<{
            exports: bootstrapLocals<aliases>
            locals: bootstrapExports<aliases> & parent
            ambient: ambient
        }>
        ambient: ambient
    }>
}

type validateAliases<aliases, $> = {
    [k in keyof aliases]: k extends GenericDeclaration<
        infer name,
        infer paramsDef
    >
        ? name extends keyof $
            ? writeDuplicateAliasesMessage<name>
            : parseGenericParams<paramsDef> extends infer result extends string[]
            ? result extends GenericParamsParseError
                ? // use the full nominal type here to avoid an overlap between the
                  // error message and a possible value for the property
                  result[0]
                : validateDefinition<
                      aliases[k],
                      $ &
                          bootstrap<aliases> & {
                              [param in result[number]]: unknown
                          }
                  >
            : never
        : k extends keyof $
        ? // TODO: more duplicate alias scenarios
          writeDuplicateAliasesMessage<k & string>
        : aliases[k] extends Scope | Type | GenericProps
        ? aliases[k]
        : validateDefinition<aliases[k], $ & bootstrap<aliases>>
}

export type bindThis<$, def> = $ & { this: Def<def> }

/** nominal type for an unparsed definition used during scope bootstrapping */
type Def<def = {}> = nominal<def, "unparsed">

/** sentinel indicating a scope that will be associated with a generic has not yet been parsed */
export type UnparsedScope = "$"

type bootstrap<aliases> = bootstrapLocals<aliases> & bootstrapExports<aliases>

type bootstrapLocals<aliases> = bootstrapAliases<{
    // intersection seems redundant but it is more efficient for TS to avoid
    // mapping all the keys
    [k in keyof aliases &
        PrivateDeclaration as extractPrivateKey<k>]: aliases[k]
}>

type bootstrapExports<aliases> = bootstrapAliases<{
    [k in Exclude<keyof aliases, PrivateDeclaration>]: aliases[k]
}>

type Preparsed = Scope | GenericProps

type bootstrapAliases<aliases> = {
    [k in Exclude<
        keyof aliases,
        GenericDeclaration
    >]: aliases[k] extends Preparsed
        ? aliases[k]
        : aliases[k] extends (() => infer thunkReturn extends Preparsed)
        ? thunkReturn
        : Def<aliases[k]>
} & {
    [k in keyof aliases & GenericDeclaration as extractGenericName<k>]: Generic<
        parseGenericParams<extractGenericParameters<k>>,
        aliases[k],
        UnparsedScope
    >
}

type inferBootstrapped<r extends Resolutions> = evaluate<{
    [k in keyof r["exports"]]: r["exports"][k] extends Def<infer def>
        ? inferDefinition<def, $<r>>
        : r["exports"][k] extends GenericProps<infer params, infer def>
        ? Generic<params, def, $<r>>
        : // otherwise should be a subscope
          r["exports"][k]
}>

type extractGenericName<k> = k extends GenericDeclaration<infer name>
    ? name
    : never

type extractGenericParameters<k> = k extends GenericDeclaration<
    string,
    infer params
>
    ? params
    : never

type extractPrivateKey<k> = k extends PrivateDeclaration<infer key>
    ? key
    : never

type PrivateDeclaration<key extends string = string> = `#${key}`

export type ScopeOptions = {
    codes?: Record<ProblemCode, { mustBe?: string }>
    keys?: KeyCheckKind
}

export type resolve<reference extends keyof $, $> = $[reference] extends Def<
    infer def
>
    ? $[reference] extends null
        ? // avoid inferring any, never
          $[reference]
        : inferDefinition<def, $>
    : $[reference]

type $<r extends Resolutions> = r["exports"] & r["locals"] & r["ambient"]

export type TypeSet<r extends Resolutions = any> = {
    [k in keyof r["exports"]]: [r["exports"][k]] extends [
        Scope<infer subresolutions>
    ]
        ? // avoid treating any, never as subscopes
          r["exports"][k] extends null
            ? Type<r["exports"][k], $<r>>
            : TypeSet<subresolutions>
        : r["exports"][k] extends GenericProps
        ? r["exports"][k]
        : Type<r["exports"][k], $<r>>
}

export type Resolutions = {
    exports: unknown
    locals: unknown
    ambient: unknown
}

export type ParseContext = {
    path: Path
    scope: Scope
}

export class Scope<r extends Resolutions = any> {
    declare infer: extractOut<r["exports"]>
    declare inferIn: extractIn<r["exports"]>

    config: TypeConfig

    private parseCache: Map<unknown, TypeNode> = new Map()
    private resolutions: Record<string, TypeNode | undefined> = {}
    private exports: TypeSet = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        this.config = {}
    }

    static root: ScopeParser<{}, {}> = (aliases) => {
        return new Scope(aliases, {}) as never
    }

    type: TypeParser<$<r>> = createTypeParser(this as never)

    declare: DeclarationParser<$<r>> = () => ({ type: this.type })

    scope: ScopeParser<r["exports"], r["ambient"]> = ((
        aliases: Dict,
        config: TypeConfig = {}
    ) => {
        return new Scope(aliases, config)
    }) as never

    define: DefinitionParser<$<r>> = (def) => def as never

    import<names extends (keyof r["exports"])[]>(
        ...names: names
    ): destructuredImportContext<r, names[number]> {
        return this as never
    }

    ambient(): Scope<{
        exports: r["exports"]
        locals: {}
        ambient: r["exports"]
    }> {
        return this as never
    }

    extract<name extends keyof r["exports"] & string>(
        name: name
    ): Type<r["exports"][name], $<r>> {
        this.resolutions[name] = this.parseRoot(this.aliases[name])
        // pass the definition directly so that it can be attached to the Type
        // it will hit the cached node and immediately resolve
        this.exports[name] = new Type(this.aliases[name], this)
        return this.exports[name] as never
    }

    parse(def: unknown, ctx: ParseContext) {
        const cached = this.parseCache.get(def)
        if (cached) {
            return cached
        }
        const result =
            typeof def === "string"
                ? parseString(def, ctx)
                : (typeof def === "object" && def !== null) ||
                  typeof def === "function"
                ? parseObject(def, ctx)
                : throwParseError(writeBadDefinitionTypeMessage(domainOf(def)))
        this.parseCache.set(def, result)
        return result
    }

    /** @internal */
    maybeResolve(name: string, ctx: ParseContext): TypeNode | undefined {
        const cached = this.resolutions[name]
        if (cached) {
            if (cached === builtins.this()) {
                if (ctx.path.length === 0) {
                    // TODO: Seen?
                    return throwParseError(
                        writeShallowCycleErrorMessage(name, [])
                    )
                }
                // TODO: doesn't seem right for cyclic? only recursive?
                return cached
            }
            // TODO: when is this cache safe? could contain this reference?
            return cached
        }
        const aliasDef = this.aliases[name]
        if (!aliasDef) {
            return
        }
        this.resolutions[name] = builtins.this()
        const resolution = this.parseRoot(aliasDef)
        this.resolutions[name] = resolution
        return resolution
    }

    parseRoot(def: unknown) {
        return this.parse(def, {
            path: new Path(),
            scope: this
        })
    }

    /** @internal */
    parseTypeRoot(def: unknown) {
        this.resolutions["this"] = builtins.this()
        const result = this.parseRoot(def)
        delete this.resolutions["this"]
        return result
    }

    private exported = false
    export<names extends (keyof r["exports"])[]>(
        ...names: names
    ): TypeSet<
        names extends [] ? r : destructuredExportContext<r, names[number]>
    > {
        if (!this.exported) {
            for (const name in this.aliases) {
                if (!this.exports[name]) {
                    this.extract(name as never)
                }
            }
            this.exported = true
        }
        if (!names.length) {
            return this.exports
        }
        const destructured: TypeSet = {}
        for (const name of names) {
            destructured[name] = this.exports[name]
        }
        return destructured
    }
}

type destructuredExportContext<
    r extends Resolutions,
    name extends keyof r["exports"]
> = {
    exports: { [k in name]: r["exports"][k] }
    locals: r["locals"] & {
        [k in Exclude<keyof r["exports"], name>]: r["exports"][k]
    }
    ambient: r["ambient"]
}

type destructuredImportContext<
    r extends Resolutions,
    name extends keyof r["exports"]
> = {
    [k in name as `#${k & string}`]: Inferred<r["exports"][k]>
}

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        ":"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
