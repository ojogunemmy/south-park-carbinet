import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function seedDatabase() {
  console.log('🌱 Seeding Supabase database with dummy data...\n');

  try {
    // 1. Seed Materials
    console.log('📦 Seeding materials...');
    const { error: materialsError } = await supabase.from('materials').insert([
      { code: 'PL170', name: 'Birch Plywood 3/4" 4x8', category: 'Plywood', unit_price: 38.51, unit: 'EA', supplier: 'Imeca Charlotte' },
      { code: 'PL71', name: 'Birch Plywood 1/4" 4x8', category: 'Plywood', unit_price: 22.83, unit: 'EA', supplier: 'Imeca Charlotte' },
      { code: 'LUM69', name: 'Poplar Lumber S3S 16\'', category: 'Lumber', unit_price: 2.86, unit: 'EA', supplier: 'Imeca Charlotte' },
      { code: 'HW25', name: 'Cabinet Hinges (pair)', category: 'Hardware', unit_price: 8.75, unit: 'EA', supplier: 'Imeca Charlotte' },
      { code: 'DR120', name: 'Drawer Slides 18"', category: 'Hardware', unit_price: 15.00, unit: 'EA', supplier: 'Imeca Charlotte' },
    ]);
    if (materialsError) throw materialsError;
    console.log('✅ Materials seeded\n');

    // 2. Seed Employees
    console.log('👥 Seeding employees...');
    const { data: employees, error: employeesError } = await supabase.from('employees').insert([
      { 
        name: 'John Smith', 
        position: 'Lead Installer', 
        weekly_rate: 1200.00, 
        hire_date: '2025-01-15',
        payment_method: 'direct_deposit',
        status: 'active',
        bank_details: { bankName: 'Chase Bank', routing: '123456789', account: '****1234' }
      },
      { 
        name: 'Maria Garcia', 
        position: 'Cabinet Maker', 
        weekly_rate: 1000.00, 
        hire_date: '2025-02-01',
        payment_method: 'check',
        status: 'active'
      },
      { 
        name: 'David Johnson', 
        position: 'Apprentice', 
        weekly_rate: 800.00, 
        hire_date: '2025-03-10',
        payment_method: 'direct_deposit',
        status: 'active',
        bank_details: { bankName: 'Bank of America', routing: '987654321', account: '****5678' }
      },
    ]).select();
    if (employeesError) throw employeesError;
    console.log('✅ Employees seeded\n');

    // 3. Seed Contracts
    console.log('📋 Seeding contracts...');
    const { error: contractsError } = await supabase.from('contracts').insert([
      {
        id: 'CON-001',
        client_name: 'Johnson Family',
        client_phone: '555-0101',
        client_email: 'johnson@email.com',
        client_address: '123 Main St, Charlotte, NC',
        project_name: 'Kitchen Cabinet Installation',
        project_address: '123 Main St, Charlotte, NC',
        total_value: 7600.00,
        deposit_amount: 3800.00,
        start_date: '2026-01-20',
        due_date: '2026-02-15',
        status: 'in_progress',
        labor_cost: 1000.00,
        misc_cost: 200.00,
        materials: [
          { code: 'PL170', quantity: 10, price: 38.51 },
          { code: 'HW25', quantity: 20, price: 8.75 }
        ]
      },
      {
        id: 'CON-002',
        client_name: 'Smith Residence',
        client_phone: '555-0102',
        project_name: 'Bathroom Vanity',
        total_value: 3500.00,
        deposit_amount: 1750.00,
        start_date: '2026-01-25',
        due_date: '2026-02-20',
        status: 'pending',
        labor_cost: 500.00,
        misc_cost: 100.00
      },
    ]);
    if (contractsError) throw contractsError;
    console.log('✅ Contracts seeded\n');

    // 4. Seed Payments
    console.log('💰 Seeding payments...');
    const paymentData = [];
    const today = new Date();
    
    // Create 4 weeks of payments for each employee
    for (let week = 0; week < 4; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      for (const emp of employees || []) {
        paymentData.push({
          employee_id: emp.id,
          week_start_date: weekStart.toISOString().split('T')[0],
          week_end_date: weekEnd.toISOString().split('T')[0],
          amount: emp.weekly_rate,
          status: week === 0 ? 'pending' : 'paid',
          payment_method: emp.payment_method,
          days_worked: 5,
          deduction_amount: 0,
          paid_date: week === 0 ? null : weekStart.toISOString().split('T')[0]
        });
      }
    }

    const { error: paymentsError } = await supabase.from('payments').insert(paymentData);
    if (paymentsError) throw paymentsError;
    console.log('✅ Payments seeded\n');

    // 5. Seed Bills
    console.log('🧾 Seeding bills...');
    const { error: billsError } = await supabase.from('bills').insert([
      {
        id: 'BILL-2026-001',
        vendor: 'Imeca Charlotte',
        invoice_number: 'INV-12345',
        amount: 487.50,
        category: 'materials',
        purchase_date: '2026-01-15',
        due_date: '2026-02-15',
        status: 'pending',
        notes: 'Plywood and hardware for Johnson project',
        contract_id: 'CON-001'
      },
      {
        id: 'BILL-2026-002',
        vendor: 'Home Depot',
        invoice_number: 'HD-98765',
        amount: 125.00,
        category: 'other',
        purchase_date: '2026-01-10',
        status: 'paid',
        paid_date: '2026-01-12',
        notes: 'Tools and supplies'
      },
    ]);
    if (billsError) throw billsError;
    console.log('✅ Bills seeded\n');

    // 6. Seed Settings
    console.log('⚙️  Seeding settings...');
    const { error: settingsError } = await supabase.from('settings').insert({
      company_name: 'South Park Cabinets',
      company_address: '456 Business Blvd, Charlotte, NC 28202',
      company_phone: '(704) 555-0100',
      bank_name: 'First National Bank',
      routing_number: '111000025',
      account_number: '****9876'
    });
    if (settingsError) throw settingsError;
    console.log('✅ Settings seeded\n');

    console.log('🎉 Database seeding complete!');
    console.log('\n📊 Summary:');
    console.log('  - 5 materials');
    console.log('  - 3 employees');
    console.log('  - 2 contracts');
    console.log('  - 12 payments (4 weeks × 3 employees)');
    console.log('  - 2 bills');
    console.log('  - 1 settings record');
    console.log('\n✅ You can now test the application!');

  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
