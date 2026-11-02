import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createTaskEmailHandler } from './handler.js';
Deno.serve(createTaskEmailHandler({
  env: name => Deno.env.get(name),
  createDatabase: () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } }),
  fetchEmail: (url, options) => fetch(url, options),
  pause: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  logError: message => console.error(message),
}));
