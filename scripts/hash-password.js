const crypto = require("crypto");

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- "your-password"');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const key = crypto
  .scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  .toString("hex");

console.log(`scrypt:32768:8:1:${salt}:${key}`);
