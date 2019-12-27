import React from "react"
import { useQuery } from "@apollo/client"
import {
    Column,
    Tree,
    IconButton,
    Modal,
    Icons,
    TreeNodeContext,
    TreeNodeTransform
} from "@re-do/components"
import { Test } from "@re-do/model"
import { ObjectView } from "./ObjectView"
import { RedoAppBar } from "./appBar"
import gql from "graphql-tag"

const transformationMetadata: Record<string, TreeNodeTransform> = {
    test: ({ value: { name, ...rest } }: TreeNodeContext<Test>) => ({
        entry: [name, rest]
    })
}

// const getTransforms = (context: TreeNodeContext) => {
//     const metaKey = getMetadataKey(context.value)
//     const customTransforms =
//         metaKey && transformationMetadata[metaKey]
//             ? transformationMetadata[metaKey]!(context)
//             : undefined
//     return { ...defaultTransforms(context), ...customTransforms }
// }

const defaultTransforms: TreeNodeTransform = ({ key, value, path }) => {
    // TODO: Fix hack
    const metaKey = "test" //getMetadataKey(value)
    const extras = (
        <Modal>
            {{
                toggle: <IconButton Icon={Icons.openModal} />,
                content: (
                    <ObjectView value={value} path={path} metaKey={metaKey} />
                )
            }}
        </Modal>
    )
    const render = ["__typename", "id"].includes(key) ? null : undefined
    return { render, extras }
}

export type TreeViewProps = {
    metaKey: string
}

export const TreeView = ({ metaKey }: TreeViewProps) => {
    const { data } = useQuery<{ tests: Test[] }>(
        gql`
            query tests {
                tests {
                    name
                    steps {
                        action
                        value
                        selector {
                            css
                        }
                    }
                    tags {
                        name
                    }
                }
            }
        `,
        { fetchPolicy: "no-cache" }
    )
    return (
        <Column justify="center">
            <RedoAppBar>{["home", "search", "account"]}</RedoAppBar>
            {data ? (
                <Tree transform={defaultTransforms}>{data.tests}</Tree>
            ) : null}
        </Column>
    )
}