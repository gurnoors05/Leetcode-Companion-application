const http = require('http');

async function runTrace() {
  console.log("=== FRONTEND TRACE (Popup.tsx) ===");
  // Simulating the user checking ONLY "Array"
  const selectedTags = ["Array"]; 
  
  // What the frontend constructs
  const data = {
    question: {
      title: "Trapping Rain Water",
      titleSlug: "trapping-rain-water",
      questionFrontendId: "42",
      difficulty: "Hard",
      topicTags: [
        { name: "Array" },
        { name: "Two Pointers" },
        { name: "Dynamic Programming" },
        { name: "Stack" },
        { name: "Monotonic Stack" }
      ]
    },
    code: "class Solution { ... }",
    lang: "cpp"
  };

  const payload = {
    title: data.question?.title || 'Unknown',
    leetcode_url: `https://leetcode.com/problems/${data.question?.titleSlug}/`,
    leetcode_number: Number(data.question?.questionFrontendId),
    difficulty: data.question?.difficulty?.toLowerCase() || 'medium',
    status: 'solved',
    patterns: selectedTags.map(tag => ({
      pattern_name: tag,
      approach_notes: "My notes",
      code_snippet: data.code,
      language: data.lang,
      time_complexity: null,
      space_complexity: null
    })),
    // Attach AI Fields
    code_hash: "dummy_hash",
    ai_suggested_patterns: [{ pattern_name: "Dynamic Programming" }],
    ai_time_complexity: "O(N)",
    ai_space_complexity: "O(1)",
    ai_reasoning: "Dummy reasoning",
    
    topic_tags: data.question?.topicTags?.map((t) => t.name) || [],
  };

  console.log("EXACT patterns array right before fetch() call fires:");
  console.log(JSON.stringify(payload.patterns, null, 2));

  console.log("\n=== BACKEND TRACE (POST /api/problems) ===");
  console.log("EXACT request body received by route.ts before any processing:");
  console.log(JSON.stringify(payload, null, 2));
  
  console.log("\n=== BACKEND TRACE (INSERT LOGIC) ===");
  // Simulate backend parsing:
  const { patterns, topic_tags } = payload;
  console.log("Backend loops over patterns:");
  for (const pat of patterns) {
     console.log(` -> Inserting pattern_name: "${pat.pattern_name}" into problem_patterns`);
  }
}

runTrace();
