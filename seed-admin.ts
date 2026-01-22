import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error("Missing ENV vars (VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY)");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const USER_ID = "e90e54a5-c431-430f-98be-972256faf798";
const EMAIL = "emmanuel@southparkcabinets.com";

async function seed() {
  console.log("Seeding profile for:", EMAIL);
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: USER_ID,
      email: EMAIL,
      name: "Emmanuel Burdier",
      role: "admin",
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error("Error seeding profile:", error.message);
    if (error.code === '42P01') {
      console.error("Table 'profiles' does not exist. Did you run the migrations?");
    }
  } else {
    console.log("Profile seeded successfully!", data);
  }
}

seed();
