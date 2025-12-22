
import { GoogleGenAI, Type } from "@google/genai";
import { TaskType, ScoringResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallBand: { type: Type.NUMBER, description: "Overall IELTS Band Score (0-9)" },
    criteria: {
      type: Type.OBJECT,
      properties: {
        taskAchievement: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["score", "explanation"]
        },
        coherenceCohesion: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["score", "explanation"]
        },
        lexicalResource: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["score", "explanation"]
        },
        grammaticalRange: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["score", "explanation"]
        }
      },
      required: ["taskAchievement", "coherenceCohesion", "lexicalResource", "grammaticalRange"]
    },
    detailedFeedback: { type: Type.STRING },
    improvedVersion: { type: Type.STRING },
    keyStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["overallBand", "criteria", "detailedFeedback", "improvedVersion", "keyStrengths", "areasForImprovement"]
};

export async function evaluateEssay(taskType: TaskType, question: string, essay: string): Promise<ScoringResult> {
  const model = "gemini-3-pro-preview";
  
  const systemInstruction = `You are a world-class IELTS Writing Examiner. You must provide a professional, accurate evaluation adhering STRICTLY to the following rubric for Bands 0 through 9.

  --- SCORING INDEPENDENCE RULE ---
  Scores for each of the four criteria MUST be evaluated independently. It is common and expected for a student to achieve different band scores across different criteria. Do not force a uniform score.

  --- WORD COUNT RULE ---
  1. Count the words in the 'STUDENT RESPONSE' accurately.
  2. For Task 1: Minimum is 150 words.
  3. For Task 2: Minimum is 250 words.
  4. If the response is significantly underlength, you MUST penalize the 'Task Achievement' (Task 1) or 'Task Response' (Task 2) score significantly.

  --- OFFICIAL RUBRIC FOR TASK 2 (BANDS 0-9) ---
  (Descriptors for Band 9 to 0 as provided previously...)
  BAND 9: Prompt fully explored. Effortsless message. Natural vocabulary. Full range of structures.
  BAND 8: Well-developed position. Ease of message. Skilful uncommon vocabulary. Accurate complex structures.
  BAND 7: Developed position. Logical organisation. Less common vocabulary used. Complex structures used accurately.
  BAND 6: Relevant position, conclusion might be repetitive. Clear progression. Adequate vocabulary. Mix of simple/complex sentences.
  BAND 5: Position expressed, development unclear. Limited linked sentences. Simple vocabulary. Range limited/repetitive.
  BAND 4: Minimally tackled. No clear progression. Basic/repetitive vocabulary. Subordinate clauses rare.
  BAND 3: Misunderstood prompt. No logical organisation. Inadequate resource. Predominant errors.
  BAND 2: Barely related. Off-topic. Recognisable strings only. No sentence control.
  BAND 1: < 20 words. Non-writer.
  BAND 0: Unattempted or non-English.

  --- FINAL CALCULATION ---
  1. Evaluate each criterion separately based on specific descriptors.
  2. Overall Band = average of the 4 scores, rounded to the nearest half or whole number (e.g., .25 -> .5, .75 -> next whole).
  3. Provide a Band 9 revision and constructive feedback.`;

  const prompt = `
    IELTS Writing Task: ${taskType}
    QUESTION PROMPT: ${question}
    STUDENT RESPONSE: ${essay}
    Evaluate the response. Pay special attention to the exact word count and ensure the criteria scores accurately reflect the length and quality independent of each other.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const result = JSON.parse(response.text);
    return result as ScoringResult;
  } catch (error) {
    console.error("Evaluation Error:", error);
    throw new Error("Failed to evaluate the essay. Please check your connection.");
  }
}
