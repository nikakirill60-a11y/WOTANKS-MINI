// npm install --no-save @supabase/auth-js@2.79.0 esbuild@0.25.12
// npx esbuild vendor/auth-entry.mjs --bundle --minify --format=iife --global-name=CTAuth --outfile=vendor/auth-2.79.min.js
export { AuthClient } from '@supabase/auth-js';
