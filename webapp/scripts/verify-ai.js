require('dotenv').config({ path: '.env' });
const jwt = require('jsonwebtoken');

// Create a valid JWT to hit our endpoints
const token = jwt.sign({ id: 1, email: 'test@test.com' }, process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_here', { expiresIn: '1h' });

const API_URL = 'http://localhost:3000/api';

const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

const twoSumCode = `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> m;
        for(int i = 0; i < nums.size(); i++){
            if(m.count(target - nums[i])) return {m[target - nums[i]], i};
            m[nums[i]] = i;
        }
        return {};
    }
};
`;

const dfsCode = `
class Solution {
    public int numIslands(char[][] grid) {
        int count = 0;
        for (int i = 0; i < grid.length; i++) {
            for (int j = 0; j < grid[0].length; j++) {
                if (grid[i][j] == '1') {
                    dfs(grid, i, j);
                    count++;
                }
            }
        }
        return count;
    }
    
    private void dfs(char[][] grid, int i, int j) {
        if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || grid[i][j] == '0') return;
        grid[i][j] = '0';
        dfs(grid, i + 1, j);
        dfs(grid, i - 1, j);
        dfs(grid, i, j + 1);
        dfs(grid, i, j - 1);
    }
}
`;

const cppCode = `}
vector<int> findLeft(vector<int>& height, int n) {
    vector<int> leftMax(n);
    leftMax[0] = height[0];
    for(int i = 1; i<n; i++) {
        leftMax[i] = max(leftMax[i-1], height[i]);
    }
    return leftMax;
}
vector<int> findRight(vector<int>& height, int n) {
    vector<int> rightMax(n);
    rightMax[n-1] = height[n-1];
    for(int i = n-2; i>=0; i--) {
        rightMax[i] = max(rightMax[i+1], height[i]);
    }
    return rightMax;
}
};`;

async function runTests() {
  console.log("=========================================");
  console.log("TEST 1: Analyzing Trapping Rain Water");
  const res1 = await fetch(`${API_URL}/ai/analyze-code`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      title: 'Trapping Rain Water',
      difficulty: 'Hard',
      language: 'cpp',
      code: cppCode
    })
  });
  const data1 = await res1.json();
  console.log(JSON.stringify(data1, null, 2));

  console.log("\\n=========================================");
  console.log("TEST 2: Analyzing Number of Islands (Java)");
  const res2 = await fetch(`${API_URL}/ai/analyze-code`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      title: 'Number of Islands',
      difficulty: 'Medium',
      language: 'java',
      code: dfsCode
    })
  });
  const data2 = await res2.json();
  console.log(JSON.stringify(data2, null, 2));

  console.log("\\n=========================================");
  console.log("TEST 3: Anti-Abuse (Spoofed Payload)");
  console.log("Attempting to save 'Palindrome' code, but injecting the AI fields from 'Number of Islands' cache...");
  
  const res3 = await fetch(`${API_URL}/problems`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      title: 'Palindrome Number',
      leetcode_url: 'https://leetcode.com/problems/palindrome-number/',
      leetcode_number: 9,
      difficulty: 'easy',
      status: 'solved',
      patterns: [{
        pattern_name: 'Math', // User selected
        code_snippet: cppCode,
        language: 'java'
      }],
      // Injecting stale/spoofed AI fields
      code_hash: data2.code_hash,
      ai_suggested_patterns: data2.ai_suggested_patterns,
      ai_time_complexity: data2.ai_time_complexity,
      ai_space_complexity: data2.ai_space_complexity,
      ai_reasoning: data2.ai_reasoning
    })
  });
  const savedData = await res3.json();
  
  if (savedData.finalAiData) {
    console.log("Save Success! Backend checked the cache.");
    console.log("-> Was the spoofed 'Graph/DFS' accepted for 'Palindrome Number'?");
    console.log("Actually Saved Patterns:", savedData.finalAiData.ai_suggested_patterns);
    console.log("AI Verified flag:", savedData.finalAiData.ai_verified);
  } else if (savedData.error) {
    console.error("Save failed:", savedData.error);
    return;
  }
}

runTests();
