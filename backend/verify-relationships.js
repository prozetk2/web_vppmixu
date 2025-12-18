// Script to verify database relationships from Prisma schema
const fs = require('fs');
const path = require('path');

// Read Prisma schema
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Parse models and relationships
const models = {};
const relationships = [];

// Extract models
const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
let match;

while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];

    models[modelName] = {
        name: modelName,
        fields: [],
        relations: []
    };

    // Extract fields and relations
    const lines = modelBody.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();

        // Check for relation fields
        if (trimmed.includes('@relation')) {
            const fieldMatch = trimmed.match(/(\w+)\s+(\w+)(\[\])?\s+@relation/);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                const relatedModel = fieldMatch[2];
                const isArray = !!fieldMatch[3];

                models[modelName].relations.push({
                    field: fieldName,
                    relatedModel: relatedModel,
                    isArray: isArray
                });
            }
        }

        // Check for foreign key fields
        const fkMatch = trimmed.match(/(\w+)\s+\w+\??\s+@map\("(\w+)"\)/);
        if (fkMatch && fkMatch[2].endsWith('_id')) {
            models[modelName].fields.push({
                name: fkMatch[1],
                dbName: fkMatch[2],
                isForeignKey: true
            });
        }
    }
}

// Generate report
console.log('='.repeat(80));
console.log('DATABASE RELATIONSHIP VERIFICATION REPORT');
console.log('='.repeat(80));
console.log();

console.log('📊 MODELS SUMMARY');
console.log('-'.repeat(80));
console.log(`Total models: ${Object.keys(models).length}`);
console.log();

// List all models with their relationships
for (const [modelName, model] of Object.entries(models)) {
    if (model.relations.length > 0) {
        console.log(`\n📦 ${modelName}`);
        console.log(`   Table: ${modelName.toLowerCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase()}`);
        console.log(`   Relations (${model.relations.length}):`);

        for (const rel of model.relations) {
            const type = rel.isArray ? 'has many' : 'belongs to';
            console.log(`   - ${rel.field}: ${type} ${rel.relatedModel}`);
        }
    }
}

console.log('\n' + '='.repeat(80));
console.log('🔗 FOREIGN KEY RELATIONSHIPS');
console.log('='.repeat(80));

const foreignKeys = [];

for (const [modelName, model] of Object.entries(models)) {
    for (const field of model.fields) {
        if (field.isForeignKey) {
            foreignKeys.push({
                table: modelName,
                column: field.dbName,
                references: field.dbName.replace(/_id$/, '')
            });
        }
    }
}

console.log(`\nTotal foreign keys: ${foreignKeys.length}\n`);

// Group by table
const byTable = {};
for (const fk of foreignKeys) {
    if (!byTable[fk.table]) {
        byTable[fk.table] = [];
    }
    byTable[fk.table].push(fk);
}

for (const [table, fks] of Object.entries(byTable)) {
    console.log(`\n${table}:`);
    for (const fk of fks) {
        console.log(`  - ${fk.column} → ${fk.references}`);
    }
}

console.log('\n' + '='.repeat(80));
console.log('✅ VERIFICATION COMPLETE');
console.log('='.repeat(80));
