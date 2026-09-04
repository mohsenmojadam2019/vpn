import bcrypt from 'bcryptjs';

const password = process.argv[2] || process.env.ADMIN_PASSWORD;
if (!password || password.length < 12) {
  console.error('Usage: node scripts/generate-admin-hash.mjs "a-strong-password-at-least-12-chars"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log(hash);
