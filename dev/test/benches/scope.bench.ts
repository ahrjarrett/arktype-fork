import { scope } from "../../../src/main.js"
import { bench } from "../../attest/main.js"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.js"

// const recursive = scope({ dejaVu: { "dejaVu?": "dejaVu" } }).compile()
// const dejaVu: typeof recursive.dejaVu.infer = {}
// let i = 0
// let current = dejaVu
// while (i < 50) {
//     current.dejaVu = { dejaVu: {} }
//     current = current.dejaVu
//     i++
// }

// bench("validate recursive", () => {
//     recursive.dejaVu(dejaVu)
// }).median([11.21, "us"])

bench("cyclic(10)", () => {
    const s = scope(cyclic10).type("user&user2").infer
})
    // .median([47.02, "us"])
    .types([6580, "instantiations"])

// bench("cyclic(10)", () => {
//     const types = scope(cyclic10).compile()
// })
//     // .median([47.02, "us"])
//     .types([3369, "instantiations"])

// bench("cyclic(100)", () => {
//     const types = scope(cyclic100).compile()
// })
//     // .median([417.71, "us"])
//     .types([15378, "instantiations"])

// bench("cyclic(500)", () => {
//     const types = scope(cyclic500).compile()
// })
//     // .median([2.62, "ms"])
//     .types([67195, "instantiations"])