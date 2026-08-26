async function runSimulation() {
  console.log("=== STEP 5: SIMULATING POPUP.TSX STATE MANAGEMENT ===\n");
  
  // Initial state
  let selectedTags = [];
  let interactedRef = { current: false };

  console.log("1. Popup opens. selectedTags is empty.");
  console.log("   selectedTags =", selectedTags, "\n");

  // AI finishes analyzing in the background (takes ~2 seconds)
  const ai_suggested_patterns = [
    { pattern_name: "Dynamic Programming" },
    { pattern_name: "Stack" },
    { pattern_name: "Monotonic Stack" }
  ];

  console.log("2. Groq AI analysis finishes. It suggests:", ai_suggested_patterns.map(p => p.pattern_name));
  
  // The code in Popup.tsx runs:
  if (ai_suggested_patterns && !interactedRef.current) {
    const newTags = ai_suggested_patterns.map(p => p.pattern_name);
    selectedTags = [...new Set([...selectedTags, ...newTags])];
    console.log("   [BUG HERE] Because interactedRef.current is FALSE, Popup auto-merges the AI tags into selectedTags!");
    console.log("   selectedTags is now =", selectedTags, "\n");
  }

  console.log("3. User looks at the screen and thinks 'I want to select Array'. User clicks 'Array'.");
  interactedRef.current = true; // interactedRef becomes true NOW
  if (selectedTags.includes("Array")) {
    selectedTags = selectedTags.filter(t => t !== "Array");
  } else {
    selectedTags = [...selectedTags, "Array"];
  }
  console.log("   User clicked Array. selectedTags is now =", selectedTags, "\n");

  console.log("4. User types 'prefix max' and hits Enter.");
  interactedRef.current = true;
  selectedTags = [...selectedTags, "prefix max"];
  console.log("   User typed prefix max. selectedTags is now =", selectedTags, "\n");

  console.log("5. User clicks Save.");
  console.log("\n=== STEP 1 LOG REPRODUCTION ===");
  const payloadPatterns = selectedTags.map(tag => ({
    pattern_name: tag
  }));
  console.log("EXACT patterns array right before fetch() call fires:");
  console.log(JSON.stringify(payloadPatterns, null, 2));

  console.log("\n=== WHY 'ALSO SOLVABLE BY' IS EMPTY ===");
  const topicTags = ["Array", "Two Pointers", "Dynamic Programming", "Stack", "Monotonic Stack"];
  console.log("LeetCode topicTags for this problem =", topicTags);
  
  const patternsInPayload = payloadPatterns.map(p => p.pattern_name);
  const alsoSolvable = topicTags.filter(t => !patternsInPayload.includes(t));
  console.log("Computation: alsoSolvable = topicTags.filter(t => !patterns.includes(t))");
  console.log("Resulting alsoSolvable =", alsoSolvable);
  console.log("Because Dynamic Programming, Stack, and Monotonic Stack were polluted into the payload, they were subtracted from topicTags, leaving almost nothing!");
}

runSimulation();
