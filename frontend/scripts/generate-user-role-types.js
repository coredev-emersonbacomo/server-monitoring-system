import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, "../../app/Data");
const enumsDir = path.resolve(__dirname, "../../app/Enums");
const outputPath = path.resolve(__dirname, "../src/types/user-role.ts");
const schemaPath = path.resolve(__dirname, "../src/api/schema.d.ts");

// ─── PHP parsing helpers ──────────────────────────────────────────────────────

function parseConstructorParams(php) {
    const params = [];
    const m = php.match(/public function __construct\s*\(([\s\S]*?)\)/);
    if (!m) return params;

    const body = m[1];
    // public readonly ?UserRole $role,  or  public readonly UserRole $role
    const re = /public\s+(?:readonly\s+)?(\??)\s*(\w+)\s+\$(\w+)/g;
    let match;
    while ((match = re.exec(body)) !== null) {
        params.push({
            nullable: match[1] === "?",
            typeName: match[2],
            fieldName: match[3],
        });
    }
    return params;
}

function parseEnumCases(php) {
    const cases = [];
    const re = /case\s+(\w+)\s*=\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(php)) !== null) {
        cases.push({ name: m[1], value: m[2] });
    }
    return cases;
}

function parseIdMap(php, cases) {
    // Build id from switch in id(): self::Admin => 1
    const map = {};
    const re = /self::(\w+)\s*=>\s*(\d+)/g;
    let m;
    while ((m = re.exec(php)) !== null) {
        map[m[1]] = parseInt(m[2], 10);
    }
    // Fallback: use array index + 1 for cases without explicit id
    return map;
}

// ─── Scan Data DTOs → build schema field overrides ────────────────────────────

// schemaFieldOverrides[schemaName][fieldName] = unionTypeString
const schemaFieldOverrides = {};

if (!fs.existsSync(dataDir)) {
    console.error("Data directory not found at", dataDir);
    process.exit(1);
}

for (const file of fs.readdirSync(dataDir).filter((f) => f.endsWith(".php"))) {
    const filePath = path.join(dataDir, file);
    const php = fs.readFileSync(filePath, "utf8");

    // Extract short class name (used by Scramble as schema name)
    const cnMatch = php.match(/class\s+(\w+)/);
    if (!cnMatch) continue;
    const schemaName = cnMatch[1];

    const params = parseConstructorParams(php);
    if (params.length === 0) continue;

    for (const { nullable, typeName, fieldName } of params) {
        const enumFile = path.join(enumsDir, `${typeName}.php`);
        if (!fs.existsSync(enumFile)) continue;

        const enumPhp = fs.readFileSync(enumFile, "utf8");
        const enumCases = parseEnumCases(enumPhp);
        if (enumCases.length === 0) continue;

        const values = enumCases.map((c) => `"${c.value}"`);
        if (nullable) values.push("null");
        const unionType = values.join(" | ");

        if (!schemaFieldOverrides[schemaName]) {
            schemaFieldOverrides[schemaName] = {};
        }
        schemaFieldOverrides[schemaName][fieldName] = unionType;
    }
}

// ─── Generate user-role.ts ────────────────────────────────────────────────────

// Collect all enums that were referenced + their info for the TS exports
const referencedEnums = new Set();
for (const fields of Object.values(schemaFieldOverrides)) {
    for (const fieldName of Object.keys(fields)) {
        // Re-derive the enum name from the DTO files
        // (simpler: we already have the typeName in params, but not stored in overrides)
        // Instead, re-scan data to collect all referenced enums
    }
}
// Re-scan data files to collect all enum references
const enumRefs = {}; // enumName -> { cases: [{name, value}], idMap: {} }
for (const file of fs.readdirSync(dataDir).filter((f) => f.endsWith(".php"))) {
    const php = fs.readFileSync(path.join(dataDir, file), "utf8");
    const params = parseConstructorParams(php);
    for (const { typeName } of params) {
        const enumFile = path.join(enumsDir, `${typeName}.php`);
        if (!fs.existsSync(enumFile)) continue;
        if (enumRefs[typeName]) continue;

        const enumPhp = fs.readFileSync(enumFile, "utf8");
        const cases = parseEnumCases(enumPhp);
        const idMap = parseIdMap(enumPhp, cases);
        enumRefs[typeName] = { cases, idMap };
    }
}

let content = `// AUTO-GENERATED FROM app/Enums/ & app/Data/\n`;
content += `// Do not edit directly. Run 'npm run types' to regenerate.\n\n`;

const enumNames = Object.keys(enumRefs);
if (enumNames.length > 0) {
    // Use the first referenced enum for the primary UserRoles lookup
    const primary = enumNames[0];
    const { cases, idMap } = enumRefs[primary];

    // UserRoles — maps case values to their string names
    content += `export const UserRoles = {\n`;
    for (const c of cases) {
        content += `    ${c.value}: "${c.value}",\n`;
    }
    content += `    Values: {\n`;
    for (const c of cases) {
        const id = idMap[c.name] ?? 0;
        content += `        ${c.value}: ${id},\n`;
    }
    content += `    } as const,\n`;
    content += `} as const;\n\n`;

    content += `export type UserRoleName = Exclude<keyof typeof UserRoles, "Values">;\n\n`;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content);
console.log(`[SUCCESS] Generated user-role.ts`);

// ─── Patch schema.d.ts ────────────────────────────────────────────────────────

if (!fs.existsSync(schemaPath)) {
    console.warn("[WARN] schema.d.ts not found, skipping patch.");
    process.exit(0);
}

let schema = fs.readFileSync(schemaPath, "utf8");
let patchCount = 0;

for (const [schemaName, fields] of Object.entries(schemaFieldOverrides)) {
    for (const [fieldName, unionType] of Object.entries(fields)) {
        // Match: `fieldName? : <type>;` or `fieldName : <type>;`
        // The ? is optional (OpenAPI marks optional fields with ? in TS)
        const re = new RegExp(
            `(${fieldName}\\??\\s*:\\s*)[^;]+(;)`,
            "g"
        );
        let replaced = false;
        schema = schema.replace(re, (match, prefix, suffix) => {
            replaced = true;
            patchCount++;
            return `${prefix}${unionType}${suffix}`;
        });

        if (replaced) {
            console.log(`  [PATCH] ${schemaName}.${fieldName} := ${unionType}`);
        } else {
            console.warn(`  [WARN] ${schemaName}.${fieldName}: not found in schema.d.ts`);
        }
    }
}

if (patchCount > 0) {
    fs.writeFileSync(schemaPath, schema);
    console.log(`[DONE] Patched ${patchCount} field(s) in schema.d.ts`);
} else {
    console.log("[SKIP] No patches applied to schema.d.ts");
}
