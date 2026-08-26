// Simulating the React state lifecycle in Popup.tsx
let selectedTags = ["Array"]; // Initial prefill from LeetCode
let interacted = false;

// 1. User interacts (Unchecks 'Array', types 'Binary Search')
function userInteraction() {
  interacted = true;
  // User unchecks Array
  selectedTags = selectedTags.filter(t => t !== "Array");
  // User types Binary Search
  selectedTags.push("Binary Search");
  console.log("State after user interaction:", selectedTags);
}

// 2. AI suggestions arrive asynchronously
function aiAnalysisCompletes() {
  const ai_suggested_patterns = [{ pattern_name: "Array" }, { pattern_name: "Divide and Conquer" }];
  
  // The exact logic in Popup.tsx:
  if (ai_suggested_patterns && !interacted) {
    const newTags = ai_suggested_patterns.map(p => p.pattern_name);
    selectedTags = Array.from(new Set([...selectedTags, ...newTags]));
  } else {
    console.log("AI suggestions blocked because user already interacted!");
  }
}

// 3. User clicks Save
function handleSave() {
  const payload = {
    title: "Find Minimum in Rotated Sorted Array",
    patterns: selectedTags.map(tag => ({
      pattern_name: tag,
      code_snippet: "class Solution { ... }"
    })),
    ai_suggested_patterns: [{ pattern_name: "Array" }, { pattern_name: "Divide and Conquer" }] // AI data is still attached for the backend
  };
  
  console.log("\n=== FINAL POST PAYLOAD ===");
  console.log(JSON.stringify(payload, null, 2));
}

console.log("=== SCENARIO: AI ARRIVES AFTER USER INTERACTION ===");
userInteraction();
aiAnalysisCompletes();
handleSave();
