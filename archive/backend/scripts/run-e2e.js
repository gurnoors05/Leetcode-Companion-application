const { execSync } = require('child_process');

const API_URL = 'http://localhost:5000/api';

async function runTest(name, execute) {
  console.log(`\n=========================================`);
  console.log(`TEST: ${name}`);
  console.log(`=========================================`);
  try {
    await execute();
  } catch (err) {
    console.error(`❌ TEST FAILED EXCEPTION:`, err.message);
  }
}

async function request(method, path, token, body = null, tokenLabel = 'user1Token') {
  const url = `${API_URL}${path}`;
  console.log(`\n-> [REQUEST] ${method} ${url}`);
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log(`-> [HEADER] Authorization: Bearer <...${tokenLabel}...>`);
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    console.log(`-> [BODY]`, JSON.stringify(body, null, 2));
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  
  let responseBody;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    responseBody = await res.json();
  } else {
    responseBody = await res.text();
  }

  console.log(`<- [RESPONSE] Status: ${res.status}`);
  console.log(`<- [BODY]`, JSON.stringify(responseBody, null, 2));
  
  return { status: res.status, data: responseBody };
}

async function runAll() {
  console.log('--- STARTING E2E TESTS ---\n');

  // 1. Run Seed Script to get tokens
  console.log('Running seed script...');
  const seedOutput = execSync('node scripts/seed.js', { encoding: 'utf-8' });
  
  // Extract tokens via regex
  const user1Match = seedOutput.match(/USER 1 JWT: (.+)/);
  const user2Match = seedOutput.match(/USER 2 JWT: (.+)/);
  const expMatch = seedOutput.match(/EXPIRED JWT \(User 1\): (.+)/);

  if (!user1Match || !user2Match || !expMatch) {
    console.error('Failed to parse JWTs from seed script output:', seedOutput);
    process.exit(1);
  }

  const user1Token = user1Match[1].trim();
  const user2Token = user2Match[1].trim();
  const expiredToken = expMatch[1].trim();
  
  let problemId;
  let patternIdToRemove;

  // Scenario 1: Create a problem with 2 patterns
  await runTest('Create problem with 2 patterns', async () => {
    const res = await request('POST', '/problems', user1Token, {
      title: 'Number of Islands',
      leetcode_url: 'https://leetcode.com/problems/number-of-islands/',
      difficulty: 'medium',
      patterns: [
        { pattern_name: 'DFS', approach_notes: 'Standard DFS approach', time_complexity: 'O(M*N)' },
        { pattern_name: 'BFS', approach_notes: 'Queue based approach', time_complexity: 'O(M*N)' }
      ]
    });
    
    if (res.status === 201) {
      problemId = res.data.id;
      // Get the pattern ID for the BFS pattern so we can test removal later
      patternIdToRemove = res.data.patterns.find(p => p.pattern_name === 'BFS').pattern_id;
    } else {
      console.error('❌ Failed to create problem. Halting remaining tests that depend on it.');
    }
  });

  // Scenario 2: Malformed body (missing title)
  await runTest('Create problem with MALFORMED body (missing title)', async () => {
    await request('POST', '/problems', user1Token, {
      leetcode_url: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'easy'
    });
  });

  // Scenario 3: Filter by pattern_id
  await runTest('GET /api/problems with pattern_id filter (Tests Inclusion & Exclusion)', async () => {
    // Seed a second problem with a different pattern (Hash Map) to prove it is excluded
    await request('POST', '/problems', user1Token, {
      title: 'Two Sum',
      leetcode_url: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'easy',
      patterns: [{ pattern_name: 'Hash Map' }]
    }, 'user1Token');
    
    // Seed a third problem with NO patterns to prove it is also excluded
    await request('POST', '/problems', user1Token, {
      title: 'Contains Duplicate',
      leetcode_url: 'https://leetcode.com/problems/contains-duplicate/',
      difficulty: 'easy',
      patterns: []
    }, 'user1Token');

    if (patternIdToRemove) {
      await request('GET', `/problems?pattern_id=${patternIdToRemove}`, user1Token, null, 'user1Token');
    } else {
      console.log('Skipped: No patternIdToRemove available from Scenario 1');
    }
  });

  // Scenario 4: GET multi-approach (should return only Number of Islands)
  await runTest('GET /api/problems/multi-approach (only >= 2 patterns)', async () => {
    await request('GET', '/problems/multi-approach', user1Token);
  });

  // Scenario 5: PATCH to remove a pattern link
  await runTest('PATCH remove a pattern link', async () => {
    if (problemId && patternIdToRemove) {
      await request('PATCH', `/problems/${problemId}/patterns`, user1Token, {
        action: 'remove',
        pattern: { pattern_id: patternIdToRemove }
      });
      
      // Verify pattern still exists in patterns table
      await request('GET', '/patterns', user1Token);
    }
  });

  // Scenario 6: Cross-user access attempt
  await runTest('Cross-user data access (User 2 trying to read User 1 problem)', async () => {
    if (problemId) {
      await request('GET', `/problems/${problemId}`, user2Token, null, 'user2Token');
    }
  });

  // Scenario 7: DELETE problem (cascade check)
  await runTest('DELETE problem and cascade check', async () => {
    if (problemId) {
      await request('DELETE', `/problems/${problemId}`, user1Token);
      
      // Verify it's gone
      await request('GET', `/problems/${problemId}`, user1Token);
    }
  });

  // Scenario 8: Expired JWT test
  await runTest('Expired JWT test', async () => {
    await request('GET', '/problems', expiredToken, null, 'expiredToken');
  });

  // Scenario 9: Tampered JWT test
  await runTest('Tampered JWT test', async () => {
    // change the last character
    const tampered = user1Token.slice(0, -1) + (user1Token.endsWith('a') ? 'b' : 'a');
    await request('GET', '/problems', tampered, null, 'tamperedToken');
  });
  
  console.log('\n--- E2E TESTS COMPLETE ---');
}

runAll();
