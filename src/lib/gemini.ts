import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getGenAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is not configured. Please check your environment variables.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface QuestionDefinition {
  id: string;
  number: string;
  text: string;
  maxMarks: number;
  expectedAnswer: string;
  gradingRubric: string;
}

export interface AIEvaluationResult {
  totalMarks: number;
  feedback: string;
  questionWise: {
    questionId: string;
    questionNumber: string;
    marksObtained: number;
    mistakes: string;
    corrections: string;
  }[];
}

export async function evaluatePaper(
  images: string[], // base64 strings
  questions: QuestionDefinition[]
): Promise<AIEvaluationResult> {
  const genAI = getGenAI();

  const prompt = `
You are an expert strict examiner for school/coaching exams in Bangladesh. 
Your task is to evaluate a student's handwritten exam paper based on the provided questions and grading criteria.

**Instructions:**
1. Analyze the uploaded images of the student's paper.
2. For each question listed below, find the student's answer in the images.
3. Compare the student's answer with the "Expected Answer".
4. Apply the "Grading Rubric" strictly to deduct marks for errors (e.g., spelling, incomplete info, sentence structure).
5. Provide detailed feedback in Bangla for each question.
6. Calculate the final marks obtained for each question.
7. Provide an overall summary feedback in Bangla.

**Questions & Criteria:**
${questions.map(q => `
- Question ${q.number}: ${q.text}
  - Max Marks: ${q.maxMarks}
  - Expected Answer: ${q.expectedAnswer}
  - Grading Rubric: ${q.gradingRubric}
`).join('\n')}

**Output Requirements:**
- Return the evaluation in JSON format.
- All text for "feedback", "mistakes", and "corrections" must be in **Bangla**.
- Be precise and fair.

**Output Schema:**
{
  "totalMarks": number,
  "feedback": "Overall summary in Bangla",
  "questionWise": [
    {
      "questionId": "string",
      "questionNumber": "string",
      "marksObtained": number,
      "mistakes": "Detailed mistakes found in Bangla",
      "corrections": "What should have been written or how to improve in Bangla"
    }
  ]
}
`;

  const imageParts = images.map(img => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: img.split(',')[1] || img // handle both data URL and raw base64
    }
  }));

  const response = await genAI.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { 
      parts: [
        { text: prompt },
        ...imageParts
      ] 
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          totalMarks: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          questionWise: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionId: { type: Type.STRING },
                questionNumber: { type: Type.STRING },
                marksObtained: { type: Type.NUMBER },
                mistakes: { type: Type.STRING },
                corrections: { type: Type.STRING }
              },
              required: ["questionId", "questionNumber", "marksObtained", "mistakes", "corrections"]
            }
          }
        },
        required: ["totalMarks", "feedback", "questionWise"]
      }
    }
  });

  const text = response.text || '';

  if (!text) {
    throw new Error("AI-এর কাছ থেকে কোনো উত্তর পাওয়া যায়নি। সম্ভবত ইমেজগুলো স্পষ্ট নয়।");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse AI response:", text);
    throw new Error("AI-এর উত্তর প্রসেস করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
  }
}

export async function extractQuestions(
  images: string[] // base64 strings
): Promise<Partial<QuestionDefinition>[]> {
  const genAI = getGenAI();

  const prompt = `
You are a highly skilled document digitization assistant specializing in educational exam papers.
Your task is to analyze the provided images (or PDF) of an exam paper and extract all questions into a clear, structured JSON format.

**CORE RULES:**
1. **Accuracy First:** Extract the text exactly as it appears on the paper. 
2. **Handle Multiple Pages:** Correctly identify when a question continues from one page to the next.
3. **Structure:** Identify main questions (1, 2, 3...) and sub-questions (a, b, c... or i, ii, iii...). 
4. **Marks Extraction:** Look for marks indicated in parentheses or brackets at the end of questions (e.g., [5] or (10)). If not found, use a reasonable default.
5. **Contextual Intelligence:** 
   - If it's a math paper, the "Expected Answer" should include the expected numerical result or formula.
   - If it's a language paper (Bangla/English), include key points the answer should cover.
6. **Rubric Generation:** Create a set of grading criteria that a human teacher would use (e.g., "Award full marks for a correct explanation", "Deduct 0.5 for spelling errors").

**JSON FORMAT REQUIRED:**
{
  "questions": [
    {
      "number": "string (e.g., '1', '1.a', 'Q1')",
      "text": "Full question text in the original language",
      "maxMarks": number,
      "expectedAnswer": "Brief clear answer or key points",
      "gradingRubric": "Specific criteria for marking this question in Bangla"
    }
  ]
}

**IMPORTANT:** Respond ONLY with the JSON object. Do not include any conversational text.
`;

  const imageParts = images.map(img => {
    const isPdf = img.includes('application/pdf');
    return {
      inlineData: {
        mimeType: isPdf ? "application/pdf" : "image/jpeg",
        data: img.split(',')[1] || img
      }
    };
  });

  const response = await genAI.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { 
      parts: [
        { text: prompt },
        ...imageParts
      ] 
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.STRING },
                text: { type: Type.STRING },
                maxMarks: { type: Type.NUMBER },
                expectedAnswer: { type: Type.STRING },
                gradingRubric: { type: Type.STRING }
              },
              required: ["number", "text", "maxMarks", "expectedAnswer", "gradingRubric"]
            }
          }
        },
        required: ["questions"]
      }
    }
  });

  const text = response.text || '';

  try {
    const data = JSON.parse(text);
    return data.questions;
  } catch (error) {
    console.error("Failed to parse AI response:", text);
    throw new Error("AI-এর মাধ্যমে প্রশ্ন এক্সট্রাক্ট করতে সমস্যা হয়েছে।");
  }
}
