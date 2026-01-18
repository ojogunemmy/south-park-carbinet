/**
 * BROWSER CONSOLE MIGRATION SCRIPT
 * 
 * HOW TO USE:
 * 1. Open http://localhost:8080 in your browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this ENTIRE file into the console
 * 4. Press Enter
 * 5. Wait for migration to complete
 * 6. Check Supabase dashboard to verify data
 */

// Import Supabase (already loaded in your app)
const { createClient } = window.supabase || {};

if (!createClient) {
  console.error('❌ Supabase not loaded. Make sure you are on http://localhost:8080');
  throw new Error('Supabase not available');
}

// Get credentials from your .env (these should be in your Vite app)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateEmployees(year) {
  console.log(`\n📋 Migrating employees for ${year}...`);
  
  const key = `employees_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No employees found for ${year}`);
    return;
  }

  const employees = JSON.parse(data);
  console.log(`  Found ${employees.length} employees`);

  for (const emp of employees) {
    const { error } = await supabase.from('employees').insert({
      name: emp.name,
      position: emp.position,
      weekly_rate: emp.weeklyRate,
      hire_date: emp.startDate,
      payment_method: emp.paymentMethod,
      bank_details: emp.bankDetails,
      status: emp.status || 'active'
    });

    if (error) {
      console.error(`  ❌ Error migrating ${emp.name}:`, error.message);
    } else {
      console.log(`  ✅ Migrated: ${emp.name}`);
    }
  }
}

async function migrateContracts(year) {
  console.log(`\n📋 Migrating contracts for ${year}...`);
  
  const key = `contracts_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No contracts found for ${year}`);
    return;
  }

  const contracts = JSON.parse(data);
  console.log(`  Found ${contracts.length} contracts`);

  for (const contract of contracts) {
    const { error } = await supabase.from('contracts').insert({
      id: contract.id,
      client_name: contract.clientName,
      project_name: contract.projectName,
      total_value: contract.totalValue,
      deposit_amount: contract.depositAmount,
      start_date: contract.startDate,
      due_date: contract.dueDate,
      status: contract.status || 'pending',
      materials: contract.materials,
      labor_cost: contract.laborCost || 0,
      misc_cost: contract.miscCost || 0
    });

    if (error) {
      console.error(`  ❌ Error migrating ${contract.id}:`, error.message);
    } else {
      console.log(`  ✅ Migrated: ${contract.id} - ${contract.projectName}`);
    }
  }
}

async function migrateMaterials(year) {
  console.log(`\n📋 Migrating materials for ${year}...`);
  
  const key = `materials_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No materials found for ${year}`);
    return;
  }

  const materials = JSON.parse(data);
  console.log(`  Found ${materials.length} materials`);

  for (const material of materials) {
    const { error } = await supabase.from('materials').insert({
      code: material.code,
      name: material.name,
      category: material.category,
      unit_price: material.price,
      unit: material.unit,
      supplier: material.supplier,
      description: material.description
    });

    if (error && !error.message.includes('duplicate')) {
      console.error(`  ❌ Error migrating ${material.code}:`, error.message);
    } else if (!error) {
      console.log(`  ✅ Migrated: ${material.code}`);
    }
  }
}

async function migratePayments(year) {
  console.log(`\n📋 Migrating payments for ${year}...`);
  
  const key = `weeklyPayments_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No payments found for ${year}`);
    return;
  }

  const payments = JSON.parse(data);
  console.log(`  Found ${payments.length} payments`);

  // Get employee mapping
  const { data: employees } = await supabase.from('employees').select('id, name');
  const employeeMap = new Map(employees?.map(e => [e.name, e.id]) || []);

  let migrated = 0;
  for (const payment of payments) {
    const employeeId = employeeMap.get(payment.employeeName);
    
    if (!employeeId) {
      console.log(`  ⚠️  Skipping payment - employee not found: ${payment.employeeName}`);
      continue;
    }

    const { error } = await supabase.from('payments').insert({
      employee_id: employeeId,
      week_start_date: payment.weekStartDate,
      week_end_date: payment.weekEndDate,
      amount: payment.amount,
      status: payment.status || 'pending',
      payment_method: payment.paymentMethod,
      check_number: payment.checkNumber,
      deduction_amount: payment.deductionAmount || 0,
      days_worked: payment.daysWorked || 5,
      paid_date: payment.paidDate
    });

    if (error) {
      console.error(`  ❌ Error:`, error.message);
    } else {
      migrated++;
    }
  }
  
  console.log(`  ✅ Migrated ${migrated} payments`);
}

async function migrateBills(year) {
  console.log(`\n📋 Migrating bills for ${year}...`);
  
  const key = `bills_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No bills found for ${year}`);
    return;
  }

  const bills = JSON.parse(data);
  console.log(`  Found ${bills.length} bills`);

  for (const bill of bills) {
    const { error } = await supabase.from('bills').insert({
      id: bill.id,
      vendor: bill.vendor,
      invoice_number: bill.invoiceNumber,
      amount: bill.amount,
      category: bill.category,
      purchase_date: bill.purchaseDate || bill.date,
      due_date: bill.dueDate,
      status: bill.status || 'pending',
      paid_date: bill.paidDate,
      notes: bill.notes,
      contract_id: bill.contractId
    });

    if (error) {
      console.error(`  ❌ Error migrating ${bill.id}:`, error.message);
    } else {
      console.log(`  ✅ Migrated: ${bill.id}`);
    }
  }
}

async function migrateSettings() {
  console.log(`\n📋 Migrating settings...`);
  
  const data = localStorage.getItem('companySettings');
  
  if (!data) {
    console.log(`  ⚠️  No settings found`);
    return;
  }

  const settings = JSON.parse(data);

  const { error } = await supabase.from('settings').insert({
    company_name: settings.companyName || 'South Park Cabinets',
    company_address: settings.companyAddress,
    company_phone: settings.companyPhone,
    bank_name: settings.bankName,
    routing_number: settings.routingNumber,
    account_number: settings.accountNumber,
    check_template: settings.checkTemplate
  });

  if (error) {
    console.error(`  ❌ Error migrating settings:`, error.message);
  } else {
    console.log(`  ✅ Settings migrated successfully`);
  }
}

async function runMigration() {
  console.log('🚀 Starting data migration from localStorage to Supabase...\n');
  
  const year = 2026; // Change this if needed

  try {
    await migrateSettings();
    await migrateMaterials(year);
    await migrateEmployees(year);
    await migrateContracts(year);
    await migratePayments(year);
    await migrateBills(year);

    console.log('\n✅ Migration complete!');
    console.log('\n📊 Next steps:');
    console.log('  1. Verify data in Supabase dashboard');
    console.log('  2. Test the application');
    console.log('  3. Backup localStorage data before clearing');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  }
}

// Run migration
console.log('Starting migration in 2 seconds...');
setTimeout(runMigration, 2000);
