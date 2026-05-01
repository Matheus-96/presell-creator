#!/usr/bin/env node

/**
 * CSRF Session Debug Script
 * Verifica se SESSION_SECRET está configurado corretamente
 */

require('dotenv').config();

console.log('\n🔍 CSRF Session Diagnostic\n');
console.log('Environment:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  PORT:', process.env.PORT || '3000');
console.log('  SESSION_SECRET configured:', !!process.env.SESSION_SECRET);

if (!process.env.SESSION_SECRET) {
  console.log('\n⚠️  WARNING: SESSION_SECRET is NOT configured!');
  console.log('   This will cause CSRF tokens to mismatch on every server restart.\n');
  console.log('   FIX: Add to your .env file:\n');
  console.log('   SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'));
  console.log('\n   Or generate a new one with:');
  console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
} else {
  console.log('   ✓ SESSION_SECRET is configured');
  console.log('\n✅ Session configuration looks good!\n');
  process.exit(0);
}
