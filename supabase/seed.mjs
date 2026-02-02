import { createClient } from "@supabase/supabase-js";
import { portfolioItems, teamMembers } from "./seed-data.mjs";

const url =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const force = process.argv.includes("--force");

if (!url || !serviceRoleKey) {
  console.error(
    "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const deleteAll = async (table) => {
  const { error } = await supabase
    .from(table)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) {
    throw new Error(`${table} delete failed: ${error.message}`);
  }
};

const seedTable = async (table, rows) => {
  const { data, error } = await supabase.from(table).select("id").limit(1);
  if (error) {
    throw new Error(`${table} read failed: ${error.message}`);
  }

  if (data && data.length > 0 && !force) {
    console.log(`${table}: 이미 데이터가 있어 생략했습니다.`);
    return;
  }

  if (force) {
    await deleteAll(table);
  }

  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) {
    throw new Error(`${table} insert failed: ${insertError.message}`);
  }

  console.log(`${table}: ${rows.length}건 입력 완료`);
};

const run = async () => {
  await seedTable("portfolio_items", portfolioItems);
  await seedTable("team_members", teamMembers);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
