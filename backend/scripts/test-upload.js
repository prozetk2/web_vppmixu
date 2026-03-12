const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  const dummyBuffer = Buffer.from('test data');
  const filePath = `products/test-${Date.now()}.txt`;

  const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, dummyBuffer, {
          contentType: 'text/plain',
          upsert: false,
      });

  if (error) {
    console.error('Supabase Upload Error:', error);
  } else {
    console.log('Upload success:', data);
    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
    console.log('Public URL:', publicUrl);
  }
}

testUpload();
