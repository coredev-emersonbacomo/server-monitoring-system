import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiJsonPath = path.resolve(__dirname, "../src/api/api.json");

if (!fs.existsSync(apiJsonPath)) {
    console.error("api.json not found.");
    process.exit(1);
}

const apiJson = JSON.parse(fs.readFileSync(apiJsonPath, "utf8"));

let changed = false;

/**
 * Fix client.store:
 * Change application/json to multipart/form-data
 */
const clientStore = apiJson.paths?.["/v1/clients"]?.post;

if (clientStore?.requestBody?.content?.["application/json"]) {
    const jsonSchema = clientStore.requestBody.content["application/json"];

    clientStore.requestBody.content = {
        "multipart/form-data": jsonSchema,
    };

    changed = true;
}

/**
 * Scramble bug workaround:
 * GET endpoints with Laravel Data are emitted as
 *   in: "body"
 * Convert them into proper query parameters.
 */
for (const pathItem of Object.values(apiJson.paths ?? {})) {
    if (!pathItem?.get?.parameters) continue;

    const parameters = pathItem.get.parameters;

    const bodyParamIndex = parameters.findIndex(
        (p) => p.in === "body" && p.name === "*",
    );

    if (bodyParamIndex === -1) continue;

    const bodyParam = parameters[bodyParamIndex];
    const schema = bodyParam.schema;

    if (!schema?.properties) continue;

    parameters.splice(bodyParamIndex, 1);

    const required = new Set(schema.required ?? []);

    for (const [name, property] of Object.entries(schema.properties)) {
        parameters.push({
            name,
            in: "query",
            required: required.has(name),
            schema: property,
        });
    }

    changed = true;
}

if (changed) {
    fs.writeFileSync(apiJsonPath, JSON.stringify(apiJson, null, 4) + "\n");
    console.log(
        "[PATCH] Applied multipart fix and converted GET body parameters to query parameters.",
    );
} else {
    console.log("[PATCH] No changes needed");
}
