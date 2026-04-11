#!/usr/bin/env node
import { execSync } from "node:child_process";

const apiBase =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8090";
const openapiUrl =
  process.env.API_OPENAPI_URL ?? apiBase.replace(/\/api\/?$/, "") + "/openapi.json";
const output = "lib/generated/api-types.ts";

const cmd = `npx openapi-typescript ${openapiUrl} -o ${output}`;

console.log(`[gen:api-types] source: ${openapiUrl}`);
console.log(`[gen:api-types] output: ${output}`);

execSync(cmd, { stdio: "inherit" });
