import { getJestConfig } from "@re-/node"

export default getJestConfig({
    collectCoverage: true,
    coverageThreshold: {
        global: {
            statements: 90,
            branches: 90,
            functions: 80,
            lines: 90
        }
    }
})