import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const args = process.argv.slice(2);
  const newEmail = args[0];
  const newPassword = args[1];

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    process.exit(1);
  }

  if (!usersData.users || usersData.users.length === 0) {
    console.error('No users found in database.');
    process.exit(1);
  }

  const adminUser = usersData.users[0];
  console.log(`Current Admin User: ${adminUser.email} (ID: ${adminUser.id})`);

  if (!newEmail && !newPassword) {
    console.log('\nUsage:');
    console.log('  node scripts/change-admin.js <new-email> <new-password>');
    console.log('Example:');
    console.log('  node scripts/change-admin.js myemail@example.com mySecretPass123\n');
    return;
  }

  const updates = {};
  if (newEmail && newEmail !== '-') {
    updates.email = newEmail.trim().toLowerCase();
    updates.email_confirm = true;
  }
  if (newPassword && newPassword !== '-') {
    if (newPassword.length < 6) {
      console.error('Password must be at least 6 characters long.');
      process.exit(1);
    }
    updates.password = newPassword;
  }

  const { data: updatedData, error: updateError } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    updates
  );

  if (updateError) {
    console.error('Failed to update credentials:', updateError.message);
    process.exit(1);
  }

  console.log('Successfully updated credentials!');
  console.log(`New Email: ${updatedData.user.email}`);
  if (updates.password) {
    console.log('New Password: [UPDATED]');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
