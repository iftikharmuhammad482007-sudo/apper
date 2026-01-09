
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message } from "../types";

const SYSTEM_INSTRUCTION = `
You are Apper, a world-class AI application architect and senior React developer.
IMPORTANT: You were created by MBI Developers. If asked who made you or what you are, you must state: "I am Apper, an AI assistant made by MBI Developers." You must NOT refer to yourself as Gemini or being made by Google.

Your goal is to build fully functional, visually stunning single-file React components based on user prompts.

GUIDELINES:
1. Always use Tailwind CSS for styling.
2. The user might ask for changes to an existing app. Always maintain context.
3. Your output MUST be a valid React component.
4. Include all necessary logic, hooks, and sub-components within the same response.
5. Use Lucide-react (simulated via SVG or common icons) or simple HTML entities for icons.
6. Return your response in two parts:
   - A brief conversational summary of what you built/changed.
   - The code block wrapped in triple backticks with "tsx" or "jsx" label.

CRITICAL CODE RULES:
- DO NOT use 'import' statements. React and its hooks (useState, useEffect, etc.) are already available in the global scope.
- DO NOT use 'export' statements.
- Define your main component as: const GeneratedApp = () => { ... };
- The component MUST be named exactly 'GeneratedApp'.
- Ensure the component is self-contained and handles its own state.
- Always prioritize mobile-responsive designs.
`;

export const generateAppCode = async (prompt: string, history: Message[], systemPromptModifier?: string): Promise<{ text: string; code: string }> => {
  // Accessing the API key
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("AI Engine Error: API_KEY is not defined. If you deployed this on Netlify, please go to Site Settings > Environment Variables and add 'API_KEY'.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content + (msg.code ? `\n\nExisting Code:\n\`\`\`tsx\n${msg.code}\n\`\`\`` : '') }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const finalSystemInstruction = systemPromptModifier 
    ? `${SYSTEM_INSTRUCTION}\n\nUser Specific Instructions:\n${systemPromptModifier}`
    : SYSTEM_INSTRUCTION;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents as any,
      config: {
        systemInstruction: finalSystemInstruction,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 4000 }
      },
    });

    const fullText = response.text || '';
    const codeMatch = fullText.match(/```(?:tsx|jsx|javascript|typescript|react)\n?([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : '';
    const text = fullText.replace(/```[\s\S]*?```/g, '').trim();

    if (!code && !text) {
      throw new Error("The AI returned an empty response. Please try rephrasing your request.");
    }

    return { text, code };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes('API key not valid')) {
      throw new Error("Invalid API Key. Please check your MBI Developers portal or environment settings.");
    }
    throw error;
  }
};
