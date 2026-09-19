// Node.js test script to verify Supabase connectivity
async function testSupabase() {
  const url = "https://htfckygwvjmbarftauww.supabase.co";
  console.log(`Kiểm tra kết nối tới Supabase: ${url}...`);

  try {
    const res = await fetch(`${url}/auth/v1/health`);
    console.log(`Status /auth/v1/health: ${res.status} ${res.statusText}`);
    const data = await res.text();
    console.log(`Response:`, data);
  } catch (err) {
    console.error(`Lỗi kết nối:`, err.message);
  }

  try {
    const res = await fetch(`${url}/rest/v1/`);
    console.log(`Status /rest/v1/: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error(`Lỗi REST API:`, err.message);
  }
}

testSupabase();
