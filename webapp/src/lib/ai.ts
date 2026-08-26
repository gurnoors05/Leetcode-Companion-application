import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const aiResponseSchema = z.object({
  suggestedPatterns: z.array(z.string()).describe("List of algorithmic patterns (e.g., 'Hash Table', 'Two Pointers', 'DFS')"),
  timeComplexity: z.string().describe("Time complexity (e.g., 'O(n)')"),
  spaceComplexity: z.string().describe("Space complexity (e.g., 'O(n)')"),
  reasoning: z.string().describe("1-2 sentences explaining why these patterns and complexities were chosen."),
});

export async function analyzeCodeWithAI(code: string, language: string, title: string, difficulty: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  const prompt = `
Analyze the following LeetCode solution.
Title: ${title}
Difficulty: ${difficulty}
Language: ${language}

Code:
${code}

You must respond with strict JSON matching the requested schema. 
CRITICAL RULES:
1. You must ONLY identify patterns that are structurally present in the given code.
2. Do not suggest patterns based on how this problem is typically solved elsewhere, common solutions, or the problem's title/difficulty. 
3. For example, if the code uses a while loop and no recursive calls, do NOT suggest "Recursion", even if recursion is a common way to solve similar problems.
4. Do not critique the code style, do not execute the code, and do not provide any extra commentary. Just identify the core algorithmic patterns actually implemented and the Big-O complexities.
`;

  const { object } = await generateObject({
    model: groq('qwen/qwen3.6-27b'),
    schema: aiResponseSchema,
    prompt: prompt,
    temperature: 0.1,
  });

  return object;
}
