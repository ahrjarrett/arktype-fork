import type { ProblemCode, ProblemOptionsByCode } from "./nodes/problems.js"
import type {
    inferDefinition,
    Inferred,
    validateDefinition
} from "./parse/definition.js"
import type {
    extractIn,
    extractOut,
    KeyCheckKind,
    TypeConfig,
    TypeParser
} from "./type.js"
import { Type } from "./type.js"
import type { evaluate, isAny, nominal } from "./utils/generics.js"
import type { split } from "./utils/lists.js"
import type { Dict } from "./utils/records.js"

export type ScopeParser<parent, ambient> = {
    <aliases>(aliases: validateAliases<aliases, parent & ambient>): Scope<{
        exports: inferExports<
            aliases,
            inferBootstrapped<bootstrap<aliases>, parent & ambient>
        >
        locals: inferLocals<
            aliases,
            inferBootstrapped<bootstrap<aliases>, parent & ambient>,
            parent
        >
        ambient: ambient
    }>
}

type inferExports<aliases, inferred> = evaluate<{
    [k in keyof inferred as `#${k & string}` extends keyof aliases
        ? never
        : k]: inferred[k]
}>

type inferLocals<aliases, inferred, parent> = evaluate<
    parent & {
        [k in keyof inferred as `#${k & string}` extends keyof aliases
            ? k
            : never]: inferred[k]
    }
>

type validateAliases<aliases, $> = evaluate<{
    [k in keyof aliases]: k extends GenericDeclaration<infer name>
        ? name extends keyof $
            ? writeDuplicateAliasesMessage<name>
            : validateDefinition<
                  aliases[k],
                  $ &
                      bootstrap<aliases> & {
                          // TODO: allow whitespace here
                          [param in paramsFrom<k>[number]]: unknown
                      }
              >
        : k extends keyof $
        ? writeDuplicateAliasesMessage<k & string>
        : aliases[k] extends Scope
        ? aliases[k]
        : validateDefinition<aliases[k], $ & bootstrap<aliases>>
}>

export type bindThis<$, def> = $ & { this: Alias<def> }

// trying to nested def here in an object or tuple cause circularities during some thunk validations
type Alias<def = {}> = nominal<def, "alias">

export type Generic<
    params extends string[] = string[],
    def = unknown
> = nominal<[params, def], "generic">

type bootstrap<aliases> = {
    [k in unmodifiedName<keyof aliases>]: aliases[k] extends Scope
        ? aliases[k]
        : Alias<aliases[k]>
} & {
    // TODO: do I need to parse the def AST here? or something more so that
    // references can be resolved if it's used outside the scope
    [k in genericKey<keyof aliases> as genericNameFrom<k>]: Generic<
        paramsFrom<k>,
        aliases[k]
    >
} & {
    [k in privateKey<keyof aliases> as privateNameFrom<k>]: Alias<aliases[k]>
}

type inferBootstrapped<bootstrapped, $> = evaluate<{
    [name in keyof bootstrapped]: bootstrapped[name] extends Alias<infer def>
        ? inferDefinition<def, $ & bootstrapped>
        : bootstrapped[name] extends Generic
        ? bootstrapped[name]
        : bootstrapped[name] extends Scope
        ? bootstrapped[name]
        : never
}>

type genericKey<k> = k & GenericDeclaration

type genericNameFrom<k> = k extends GenericDeclaration<infer name>
    ? name
    : never

type unmodifiedName<k> = Exclude<k, GenericDeclaration | PrivateDeclaration>

type privateKey<k> = k & PrivateDeclaration

type privateNameFrom<k> = k extends PrivateDeclaration<infer name>
    ? name
    : never

export type GenericDeclaration<
    name extends string = string,
    params extends string = string
> = `${name}<${params}>`

type PrivateDeclaration<name extends string = string> = `#${name}`

type paramsFrom<scopeKey> = scopeKey extends GenericDeclaration<
    string,
    infer params
>
    ? split<params, ",">
    : []

export type ScopeOptions = {
    root?: Space
    codes?: Record<ProblemCode, { mustBe?: string }>
    keys?: KeyCheckKind
}

export type ScopeConfig = evaluate<{
    readonly keys: KeyCheckKind
    readonly codes: ProblemOptionsByCode
}>

export const compileScopeOptions = (opts: ScopeOptions): ScopeConfig => ({
    codes: {},
    keys: opts.keys ?? "loose"
})

export type resolve<reference extends keyof $, $> = isAny<
    $[reference]
> extends true
    ? any
    : $[reference] extends Alias<infer def>
    ? inferDefinition<def, $>
    : $[reference]

export type resolveSubalias<
    reference extends subaliasOf<$>,
    $
> = reference extends `${infer subscope}.${infer name}`
    ? subscope extends keyof $
        ? $[subscope] extends Scope
            ? name extends keyof $[subscope]["infer"]
                ? $[subscope]["infer"][name]
                : never
            : never
        : never
    : never

export type subaliasOf<$> = {
    [k in keyof $]: $[k] extends Scope<infer sub>
        ? {
              [subalias in keyof sub["exports"]]: `${k & string}.${subalias &
                  string}`
          }[keyof sub["exports"]]
        : never
}[keyof $]

export type Space<c extends Context = any> = {
    [k in keyof c["exports"]]: c["exports"][k] extends Scope<infer sub>
        ? Space<sub>
        : Type<c["exports"][k], c["exports"] & c["locals"] & c["ambient"]>
}

export type Context = {
    exports: unknown
    locals: unknown
    ambient: unknown
}

export class Scope<c extends Context = any> {
    declare infer: extractOut<c["exports"]>
    declare inferIn: extractIn<c["exports"]>

    readonly config: ScopeConfig
    private resolutions: Record<string, Type | Space> = {}
    private exports: Record<string, Type | Space> = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        this.config = compileScopeOptions(opts)

        // this.cacheSpaces(opts.root ?? registry().ark, "imports")
        // if (opts.imports) {
        //     this.cacheSpaces(opts.imports, "imports")
        // }
    }

    static root: ScopeParser<{}, {}> = (aliases) => {
        return new Scope(aliases, {})
    }

    type: TypeParser<c["exports"] & c["locals"] & c["ambient"]> = ((
        def: unknown,
        config: TypeConfig = {}
    ) => {
        return !config || new Type(def, this)
    }) as never

    scope: ScopeParser<c["exports"], c["ambient"]> = ((
        aliases: Dict,
        config: TypeConfig = {}
    ) => {
        return new Scope(aliases, config)
    }) as never

    import<names extends (keyof c["exports"])[]>(
        ...names: names
    ): destructuredImportContext<c, names[number]> {
        return {} as any
    }

    maybeResolve(name: string): Type | undefined {
        if (this.resolutions[name]) {
            // TODO: Scope resolution
            return this.resolutions[name] as Type
        }
        const aliasDef = this.aliases[name]
        if (!aliasDef) {
            return
        }
        const resolution = new Type(aliasDef, this)
        this.resolutions[name] = resolution
        this.exports[name] = resolution
        return resolution
    }

    private exported = false
    export<names extends (keyof c["exports"])[]>(...names: names) {
        if (!this.exported) {
            for (const name in this.aliases) {
                this.exports[name] ??= this.maybeResolve(name) as Type
            }
            this.exported = true
        }
        return this.exports as Space<
            names extends [] ? c : destructuredExportContext<c, names[number]>
        >
    }
}

type destructuredExportContext<
    c extends Context,
    name extends keyof c["exports"]
> = {
    exports: { [k in name]: c["exports"][k] }
    locals: c["locals"] & {
        [k in Exclude<keyof c["exports"], name>]: c["exports"][k]
    }
    ambient: c["ambient"]
}

type destructuredImportContext<
    c extends Context,
    name extends keyof c["exports"]
> = {
    [k in name as `#${k & string}`]: Inferred<c["exports"][k]>
}

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
