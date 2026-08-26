async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/github/callback?code=bad_code');
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
run();
