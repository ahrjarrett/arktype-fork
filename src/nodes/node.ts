import type { BranchNode } from "./branch.ts"
import type { Compilation } from "./compile.ts"
import type { Comparison } from "./compose.ts"
import { ComparisonState } from "./compose.ts"

export type BranchesComparison = {
    lStrictSubtypeIndices: number[]
    rStrictSubtypeIndices: number[]
    equalIndexPairs: [lIndex: number, rIndex: number][]
    distinctIntersections: BranchNode[]
}

export class TypeNode {
    constructor(public branches: BranchNode[]) {}

    compile(c: Compilation): string {
        return ""
    }

    compare(
        branches: BranchNode[],
        state: ComparisonState
    ): Comparison<TypeNode> {
        const comparison = compareBranches(this.branches, branches, state)
        const resultBranches = [
            ...comparison.distinctIntersections,
            ...comparison.equalIndexPairs.map(
                (indices) => this.branches[indices[0]]
            ),
            ...comparison.lStrictSubtypeIndices.map(
                (lIndex) => this.branches[lIndex]
            ),
            ...comparison.rStrictSubtypeIndices.map(
                (rIndex) => branches[rIndex]
            )
        ]
        if (resultBranches.length === 0) {
            return state.disjoint("union", this.branches, branches)
        }
        return {
            intersection: new TypeNode(resultBranches),
            isSubtype:
                comparison.lStrictSubtypeIndices.length +
                    comparison.equalIndexPairs.length ===
                this.branches.length,
            isSupertype:
                comparison.rStrictSubtypeIndices.length +
                    comparison.equalIndexPairs.length ===
                branches.length,
            isDisjoint: false
        }
    }

    union(branches: BranchNode[]) {
        const state = new ComparisonState("|")
        const comparison = compareBranches(this.branches, branches, state)
        const resultBranches = [
            ...this.branches.filter(
                (_, lIndex) =>
                    !comparison.lStrictSubtypeIndices.includes(lIndex)
            ),
            ...branches.filter(
                (_, rIndex) =>
                    !comparison.rStrictSubtypeIndices.includes(rIndex) &&
                    // ensure equal branches are only included once
                    !comparison.equalIndexPairs.some(
                        (indexPair) => indexPair[1] === rIndex
                    )
            )
        ]
        // TODO: if a boolean has multiple branches, neither of which is a
        // subtype of the other, it consists of two opposite literals
        // and can be simplified to a non-literal boolean.
        return new TypeNode(resultBranches)
    }

    toArray() {
        return {
            object: {
                instance: Array,
                props: {
                    [mappedKeys.index]: this
                }
            }
        }
    }
}

const compareBranches = (
    lBranches: BranchNode[],
    rBranches: BranchNode[],
    state: ComparisonState
) => {
    const comparison: BranchesComparison = {
        lStrictSubtypeIndices: [],
        rStrictSubtypeIndices: [],
        equalIndexPairs: [],
        distinctIntersections: []
    }
    // Each rBranch is initialized to an empty array to which distinct
    // intersections will be appended. If the rBranch is identified as a
    // subtype (or equal) of any lBranch, the corresponding value should be
    // set to null so we can avoid including previous/future intersections
    // in the final result.
    const intersectionsByR: (BranchNode[] | null)[] = rBranches.map(() => [])
    for (let lIndex = 0; lIndex < lBranches.length; lIndex++) {
        const intersectionsOfL: BranchNode[] = []
        for (let rIndex = 0; rIndex < rBranches.length; rIndex++) {
            if (!intersectionsByR[rIndex]) {
                // we've identified this rBranch as a subtype of
                // an lBranch and will not yield any distinct intersections.
                continue
            }
            const intersection = lBranches[lIndex].compare(
                rBranches[rIndex],
                state
            )
            if (intersection.isDisjoint) {
                // doesn't tell us about any redundancies or add a distinct intersection
                continue
            }
            if (intersection.isSubtype) {
                if (intersection.isSupertype) {
                    // If branches are equal, execute logic explained in supertype case.
                    intersectionsByR[rIndex] = null
                    comparison.equalIndexPairs.push([lIndex, rIndex])
                } else {
                    comparison.lStrictSubtypeIndices.push(lIndex)
                }
                // If l is a subtype of the current r branch, intersections
                // with previous and remaining branches of r won't lead to
                // distinct intersections, so empty lIntersections and break
                // from the inner loop.
                intersectionsOfL.length = 0
                break
            }
            if (intersection.isSupertype) {
                // If r is a subtype of the current l branch, we set its
                // intersections to null, removing any previous
                // intersections including it and preventing any of its
                // remaining intersections from being computed.
                intersectionsByR[rIndex] = null
                comparison.rStrictSubtypeIndices.push(rIndex)
            } else {
                // If neither l nor r is a subtype of the other, add their
                // intersection as a candidate for the final result (could
                // still be removed if it is determined l or r is a subtype
                // of a remaining branch).
                intersectionsOfL.push(intersection.intersection)
            }
        }
        comparison.distinctIntersections.push(...intersectionsOfL)
    }
    return comparison
}

// const state = new IntersectionState(type, "&")
// const result = nodeIntersection(l, r, state)
// return isDisjoint(result)
//     ? throwParseError(compileDisjointReasonsMessage(state.disjoints))
//     : isEquality(result)
//     ? l
//     : result

// export type ConfigNode<$ = Dict> = {
//     config: TypeConfig
//     node: DomainsJson<$>
// }

// export type LiteralNode<
//     domain extends Domain = Domain,
//     value extends inferDomain<domain> = inferDomain<domain>
// > = {
//     [k in domain]: LiteralRules<domain, value>
// }

// export const isLiteralNode = <domain extends Domain>(
//     node: ResolvedNode,
//     domain: domain
// ): node is LiteralNode<domain> => {
//     return (
//         resolutionExtendsDomain(node, domain) &&
//         isLiteralCondition(node[domain])
//     )
// }

// export type DomainSubtypeResolution<domain extends Domain> = {
//     readonly [k in domain]: defined<DomainsNode[domain]>
// }

// export const resolutionExtendsDomain = <domain extends Domain>(
//     resolution: ResolvedNode,
//     domain: domain
// ): resolution is DomainSubtypeResolution<domain> => {
//     const domains = keysOf(resolution)
//     return domains.length === 1 && domains[0] === domain
// }
