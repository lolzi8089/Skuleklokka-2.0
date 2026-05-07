import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = (process.env.GEMINI_API_KEY as string) || (import.meta.env.VITE_GEMINI_API_KEY as string);
const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: "Du er ein hjelpsam assistent for SkuleKlokka, ein app for elevar. Du svarar på nynorsk og gir tips om kva ein kan gjere i friminutt, korleis ein kan studere betre, eller kva som skjer i skulekvardagen.",
});

export const isGeminiConfigured = !!apiKey && apiKey !== 'din_gemini_api_key_her';

export async function getBreakTip(breakName: string) {
  if (!isGeminiConfigured) return null;
  
  try {
    const prompt = `Gi eit kort, motiverande tips (maks 2 setningar) til kva ein elev kan gjere i ${breakName.toLowerCase()}.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini error:", error);
    return null;
  }
}
