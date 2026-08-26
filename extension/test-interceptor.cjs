const fs = require('fs');
const path = require('path');

// 1. Setup Mock Browser Environment
const eventsFired = [];

global.window = {
  postMessage: (msg) => {
    if (msg.type === 'LC_COMPANION_ACCEPTED') {
      eventsFired.push(msg.payload);
    }
  }
};

global.Request = class Request {
  constructor(url) { this.url = url; }
};

// Mock the original fetch
global.window.fetch = async (url, options) => {
  let responseData = {};
  
  // Resolve mock data based on URL and body
  if (url.includes('/graphql') && options && options.body) {
    const body = JSON.parse(options.body);
    if (body.operationName === 'questionDetail') {
      responseData = {
        data: {
          question: {
            title: "Two Sum",
            titleSlug: "two-sum",
            questionId: "1",
            questionFrontendId: "1",
            difficulty: "Easy",
            topicTags: [{name: "Array", slug: "array"}]
          }
        }
      };
    }
  } else if (url.includes('/submit/')) {
    responseData = { submission_id: 2116358953 };
  } else if (url.includes('/check/')) {
    // Determine which check state to return based on a global mock state
    responseData = global.mockCheckResponse;
  }

  return {
    clone: () => ({
      json: async () => responseData
    })
  };
};

// 2. Load the Interceptor
const interceptorCode = fs.readFileSync(path.join(__dirname, 'src', 'interceptor.ts'), 'utf8');
// Strip TypeScript annotations using simple regex for this isolated test
const cleanCode = interceptorCode.replace(/const questionCache: Record<string, any> = {};/, 'const questionCache = {};')
                                 .replace(/const submissionCache: Record<string, \{ code: string, lang: string \}> = {};/, 'const submissionCache = {};');

eval(cleanCode);

// 3. Test Cases
async function runTests() {
  console.log('--- RUNNING INTERCEPTOR TESTS ---');

  // Step 1: Simulate Page Load (questionDetail)
  await window.fetch('https://leetcode.com/graphql/', {
    method: 'POST',
    body: JSON.stringify({ operationName: 'questionDetail' })
  });
  console.log('✅ Simulated GraphQL questionDetail load');

  // Step 2: Simulate Code Submission
  await window.fetch('https://leetcode.com/problems/two-sum/submit/', {
    method: 'POST',
    body: JSON.stringify({ lang: 'cpp', question_id: '1', typed_code: 'return {};' })
  });
  console.log('✅ Simulated Code Submission');

  // TEST (a): Ignores COMPILING/PENDING intermediate states
  eventsFired.length = 0; // reset
  console.log('\\n[TEST A] Testing intermediate state: COMPILING');
  global.mockCheckResponse = { state: "COMPILING" };
  await window.fetch('https://leetcode.com/submissions/detail/2116358953/check/');
  console.log('Result: ' + (eventsFired.length === 0 ? 'Ignored' : 'Fired!'));

  console.log('[TEST A] Testing intermediate state: PENDING');
  global.mockCheckResponse = { state: "PENDING" };
  await window.fetch('https://leetcode.com/submissions/detail/2116358953/check/');
  console.log('Result: ' + (eventsFired.length === 0 ? 'Ignored' : 'Fired!'));
  
  if (eventsFired.length === 0) {
    console.log('✅ TEST A PASSED: Interceptor correctly ignored COMPILING and PENDING states.');
  } else {
    console.error('❌ TEST A FAILED: Event fired prematurely on intermediate state.');
  }

  // TEST (b): Correctly fires only on SUCCESS+Accepted
  console.log('\\n[TEST B] Testing REAL final successful state: SUCCESS + Accepted');
  global.mockCheckResponse = {
    status_code: 10,
    lang: "cpp",
    run_success: true,
    question_id: "1",
    total_correct: 65,
    total_testcases: 65,
    submission_id: "2116358953",
    status_msg: "Accepted",
    state: "SUCCESS"
  };
  await window.fetch('https://leetcode.com/submissions/detail/2116358953/check/');

  if (eventsFired.length === 1 && eventsFired[0].question.title === 'Two Sum') {
    console.log('✅ TEST B PASSED: Interceptor fired correctly on SUCCESS + Accepted.');
    console.log('   Payload Captured:', JSON.stringify(eventsFired[0], null, 2));
  } else {
    console.error('❌ TEST B FAILED: Event did not fire or payload was incorrect.', eventsFired);
  }

  // TEST (c): Does NOT fire for a failed submission (Wrong Answer)
  eventsFired.length = 0; // reset
  console.log('\\n[TEST C] Testing SYNTHETIC fixture for a failed submission: SUCCESS + Wrong Answer');
  global.mockCheckResponse = {
    status_code: 11,
    lang: "cpp",
    run_success: true,
    question_id: "1",
    total_correct: 10,
    total_testcases: 65,
    submission_id: "2116358954",
    status_msg: "Wrong Answer",
    state: "SUCCESS"
  };
  await window.fetch('https://leetcode.com/submissions/detail/2116358954/check/');

  console.log('Result: ' + (eventsFired.length === 0 ? 'Ignored' : 'Fired!'));
  if (eventsFired.length === 0) {
    console.log('✅ TEST C PASSED: Interceptor successfully ignored SUCCESS + Wrong Answer.');
  } else {
    console.error('❌ TEST C FAILED: Event fired on Wrong Answer.');
  }
}

// Due to async fetch internals, add small delay to allow .json() promise chains to resolve
const originalFetchCall = window.fetch;
window.fetch = async (...args) => {
  await originalFetchCall(...args);
  await new Promise(r => setTimeout(r, 10)); // allow async handlers to fire
};

runTests().catch(console.error);
