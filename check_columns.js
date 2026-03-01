const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('couriers').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(data[0]));
}
check();
