const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Accessing internal dmmf to see the model definition
const dmmf = prisma._baseDmmf || prisma._dmmf;
if (dmmf && dmmf.datamodel) {
    const userModel = dmmf.datamodel.models.find(m => m.name === 'User');
    if (userModel) {
        console.log('User model found:');
        console.log(JSON.stringify(userModel.fields.map(f => f.name), null, 2));
    } else {
        console.log('User model NOT found in DMMF');
    }
} else {
    console.log('Could not access DMMF');
    // Fallback: try to inspect the class or prototype if possible, but DMMF is best
}
