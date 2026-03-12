const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    console.log('Available buckets:', data.map(b => b.name));
    const hasProductBuckets = data.some(b => b.name === 'product-images');
    if (!hasProductBuckets) {
       console.log("Bucket 'product-images' NOT FOUND. Attempting to create...");
       const { data: createData, error: createError } = await supabase.storage.createBucket('product-images', {
         public: true,
         fileSizeLimit: 1048576 * 10, // 10MB
       });
       if (createError) {
         console.error('Error creating bucket:', createError);
       } else {
         console.log('Bucket created successfully!');
       }
    }
  }
}

checkBuckets();
