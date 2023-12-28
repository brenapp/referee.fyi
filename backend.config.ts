import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

export default defineConfig({
    input: "backend/main.ts",
    output: {
        file: "dist/_worker.js",
        format: "esm"
    },
    plugins: [typescript({
        tsconfig: "./backend/tsconfig.json"
    })]
});
