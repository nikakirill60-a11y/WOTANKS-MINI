// npm install --no-save @supabase/realtime-js@2.79.0 esbuild@0.25.12
// npx esbuild vendor/realtime-entry.mjs --bundle --minify --format=iife --global-name=CTRealtime --outfile=vendor/realtime-2.79.min.js
export { RealtimeClient } from '@supabase/realtime-js';
