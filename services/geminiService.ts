
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Participant, PRDraftReview } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a mock response.");
}

// FIX: Updated the function's parameter type to exclude 'status'.
// The 'status' property is not required to generate a PR draft,
// and this change aligns the type signature with the function's actual usage,
// resolving a type mismatch error when called from RegistrationForm.tsx.
const generatePRDraft = async (participant: Omit<Participant, 'id' | 'prDraft' | 'photo' | 'status' | 'prDraftReview' | 'qrCode'>): Promise<string> => {
  if (!process.env.API_KEY) {
    return Promise.resolve(`This is a mock PR draft for ${participant.name}, a promising ${participant.targetAudience} from ${participant.collegeName}, studying ${participant.course}. Enrolled in the "${participant.programEnrolled}" program, ${participant.name} is passionate about agriculture and food processing. With goals like "${participant.goals}" and hobbies such as "${participant.hobbies}", they are poised to make a significant impact. This training will further equip them with practical skills to excel in the agro-economic sector, contributing to innovative startups and community growth. We look forward to their success.`);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Generate a professional and inspiring Public Relations (PR) draft of approximately 100 words for a skill training program participant.
      The tone should be positive and forward-looking.
      Do not use markdown. Output plain text only.

      Participant Details:
      - Name: ${participant.name}
      - College: ${participant.collegeName}
      - Course: ${participant.course}
      - Program Enrolled In: ${participant.programEnrolled}
      - Target Audience Category: ${participant.targetAudience}
      - Stated Goals: ${participant.goals}
      - Hobbies: ${participant.hobbies}
      - Address: ${participant.city}

      Draft the PR highlighting their potential and the value of the training program.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating PR draft with Gemini:", error);
    throw new Error("Failed to generate PR draft. Please try again.");
  }
};

const reviewPRDraft = async (draft: string): Promise<PRDraftReview> => {
  if (!process.env.API_KEY) {
    // Mock response for testing without API key
    return Promise.resolve({
      score: 8,
      feedback: [
        "Excellent positive tone and professional language.",
        "Clearly highlights the participant's potential.",
        "Could be slightly more concise to improve impact."
      ]
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      As a Public Relations expert, please review the following PR draft written for a skill training program participant.
      Provide a quality score out of 10 and 2-3 brief, constructive feedback points.
      The score should reflect the draft's professionalism, tone, clarity, and effectiveness.

      PR Draft to review:
      ---
      ${draft}
      ---
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: 'A quality score for the PR draft, from 1 to 10.'
            },
            feedback: {
              type: Type.ARRAY,
              description: 'An array of 2-3 brief, constructive feedback points.',
              items: {
                type: Type.STRING
              }
            }
          }
        }
      }
    });

    const jsonResponse = JSON.parse(response.text);
    return jsonResponse as PRDraftReview;

  } catch (error) {
    console.error("Error reviewing PR draft with Gemini:", error);
    // Return a default/error review object instead of throwing, so the app flow can continue
    return {
      score: 0,
      feedback: ["Failed to get PR draft review. Please check the content manually."]
    };
  }
};

const enhanceParticipantPhoto = async (base64Image: string): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not set for photo enhancement. Returning original image.");
    return base64Image;
  }
  
  const parts = base64Image.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!parts || parts.length !== 3) {
    console.error("Invalid base64 image format for enhancement.");
    return base64Image; // Return original if format is wrong
  }
  const mimeType = parts[1];
  const data = parts[2];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: "Enhance this person's photo for a professional profile. Give it a clean, professional-looking, and neutral background suitable for a corporate or program ID. Do not change the person's facial features or appearance. Just improve the lighting and replace the background." },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => 'inlineData' in part);
    if (imagePart && imagePart.inlineData) {
      const responseMimeType = imagePart.inlineData.mimeType || 'image/png';
      return `data:${responseMimeType};base64,${imagePart.inlineData.data}`;
    } else {
      throw new Error("No image data returned from API.");
    }
  } catch (error) {
    console.error("Error enhancing photo with Gemini:", error);
    return base64Image; // On failure, return the original image
  }
};


export { generatePRDraft, reviewPRDraft, enhanceParticipantPhoto };