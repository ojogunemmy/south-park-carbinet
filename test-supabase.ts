import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing ENV vars");
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  console.log("Testing connection to:", url);
  try {
    // Attempt to sign in with a dummy or known user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "emmanuel@southparkcabinets.com",
      password: "661173@Just"
    });

    if (error) {
      console.error("Auth Error:", error.message);
      console.error("Full Error:", JSON.stringify(error));
    } else {
      console.log("Auth Success!");
      console.log("User:", data.user?.id);
    }
  } catch (e: any) {
    console.error("System Error:", e.message);
  }
}

test();
