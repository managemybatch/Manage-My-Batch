import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const response = await ai.models.generateContent({
    model: "gemini-1.5-pro",
    contents: {
      parts: [
        ...imageParts,
        { text: prompt }
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

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse AI response:", response.text);
    throw new Error("AI-এর উত্তর প্রসেস করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
  }
}
