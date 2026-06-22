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

// Fix client.store: change application/json to multipart/form-data
// because CreateClientData has an UploadedFile property
const clientStore = apiJson.paths?.["/clients"]?.post;
if (clientStore?.requestBody?.content?.["application/json"]) {
    const jsonSchema = clientStore.requestBody.content["application/json"];
    clientStore.requestBody.content = {
        "multipart/form-data": jsonSchema,
    };
    changed = true;
}

if (changed) {
    fs.writeFileSync(apiJsonPath, JSON.stringify(apiJson, null, 4) + "\n");
    console.log("[PATCH] Fixed client.store content type to multipart/form-data");
} else {
    console.log("[PATCH] No changes needed");
}
