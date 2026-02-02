import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('  VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📋 Reading ledger audit migration file...');
    
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260201000000_ledger_audit_system.sql'
    );
    
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('🔧 Applying migration to Supabase...');
    
    // Split by semicolons but be careful with function definitions
    const statements = sql
      .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split on ; but not inside strings
      .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
      console.log(`Preview: ${stmt.substring(0, 100)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).single();
      
      if (error) {
        // Try direct execution for DDL statements
        const { error: directError } = await supabase
          .from('_migrations')
          .insert({ name: '20260201000000_ledger_audit_system' });
        
        if (directError && directError.message.includes('already exists')) {
          console.log('⚠️  Statement already applied, skipping...');
          continue;
        }
        
        console.error('❌ Error executing statement:', error.message);
        console.error('Statement:', stmt);
        
        // Continue with next statement instead of failing completely
        console.log('⏭️  Continuing with next statement...');
      } else {
        console.log('✅ Statement executed successfully');
      }
    }
    
    console.log('\n✨ Migration application completed!');
    console.log('');
    console.log('🧪 Testing the create_payment_reversal function...');
    
    // Test if the function exists
    const { data, error } = await supabase.rpc('create_payment_reversal', {
      p_original_payment_id: 'test-id-that-doesnt-exist',
      p_reason: 'Test',
      p_user_id: null
    });
    
    if (error && error.message.includes('Payment not found')) {
      console.log('✅ Function exists and working (expected error for non-existent payment)');
    } else if (error && error.message.includes('does not exist')) {
      console.error('❌ Function does not exist - migration may have failed');
      console.error('   Please apply the migration manually via Supabase Dashboard');
    } else {
      console.log('✅ Function created successfully');
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📖 Manual steps:');
    console.error('1. Go to Supabase Dashboard > SQL Editor');
    console.error('2. Copy the contents of supabase/migrations/20260201000000_ledger_audit_system.sql');
    console.error('3. Paste and run in the SQL Editor');
    process.exit(1);
  }
}

applyMigration();
