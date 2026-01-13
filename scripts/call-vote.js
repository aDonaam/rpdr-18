(async () => {
  try {
    console.log('=== Testing looks API (Supabase only) ===\n');

    // 1. GET looks (public)
    console.log('1. GET /rpdr-18/api/looks');
    const getRes = await fetch('http://localhost:3001/rpdr-18/api/looks');
    const getLooks = await getRes.json();
    console.log(`   Status: ${getRes.status}`);
    console.log(`   Looks count: ${getLooks.looks?.length ?? 0}\n`);

    console.log('=== Tests complete ===');
  } catch (err) {
    console.error('Test error:', String(err));
  }
})();
