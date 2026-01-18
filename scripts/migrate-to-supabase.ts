import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Migration script to transfer data from localStorage to Supabase
 * Run this ONCE after Supabase setup is complete
 * 
 * IMPORTANT: Run this in the browser console, not via tsx!
 * Open http://localhost:8080 and paste this script in the console.
 */

interface LocalStorageEmployee {
  id: string;
  name: string;
  position: string;
  weeklyRate: number;
  startDate: string;
  paymentMethod: string;
  bankDetails: any;
  status: string;
}

interface LocalStorageContract {
  id: string;
  clientName: string;
  projectName: string;
  totalValue: number;
  depositAmount: number;
  startDate: string;
  dueDate: string;
  status: string;
  materials: any;
  laborCost: number;
  miscCost: number;
}

interface LocalStorageMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  description?: string;
  supplier?: string;
}

async function migrateEmployees(year: number) {
  console.log(`\n📋 Migrating employees for ${year}...`);
  
  const key = `employees_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No employees found for ${year}`);
    return;
  }

  const employees: LocalStorageEmployee[] = JSON.parse(data);
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

async function migrateContracts(year: number) {
  console.log(`\n📋 Migrating contracts for ${year}...`);
  
  const key = `contracts_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No contracts found for ${year}`);
    return;
  }

  const contracts: LocalStorageContract[] = JSON.parse(data);
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

async function migrateMaterials(year: number) {
  console.log(`\n📋 Migrating materials for ${year}...`);
  
  const key = `materials_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No materials found for ${year}`);
    return;
  }

  const materials: LocalStorageMaterial[] = JSON.parse(data);
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

    if (error) {
      // Skip duplicates (materials might be shared across years)
      if (!error.message.includes('duplicate')) {
        console.error(`  ❌ Error migrating ${material.code}:`, error.message);
      }
    } else {
      console.log(`  ✅ Migrated: ${material.code} - ${material.name}`);
    }
  }
}

async function migratePayments(year: number) {
  console.log(`\n📋 Migrating payments for ${year}...`);
  
  const key = `weeklyPayments_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No payments found for ${year}`);
    return;
  }

  const payments: any[] = JSON.parse(data);
  console.log(`  Found ${payments.length} payments`);

  // First, get employee mapping (localStorage ID -> Supabase ID)
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
      console.error(`  ❌ Error migrating payment:`, error.message);
    } else {
      migrated++;
    }
  }
  
  console.log(`  ✅ Migrated ${migrated} payments`);
}

async function migrateBills(year: number) {
  console.log(`\n📋 Migrating bills for ${year}...`);
  
  const key = `bills_${year}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.log(`  ⚠️  No bills found for ${year}`);
    return;
  }

  const bills: any[] = JSON.parse(data);
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
  console.log('⚠️  Make sure you have:');
  console.log('  1. Created Supabase project');
  console.log('  2. Run all SQL migrations');
  console.log('  3. Set up .env file with credentials\n');

  const year = 2026; // Change this to migrate different years

  try {
    // Migrate in order (dependencies matter!)
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
runMigration();
