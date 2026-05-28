
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Participant, PRDraftReview } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a mock response.");
}

/**
 * Generates a PR Draft using a structured Role-Goal-Input-Output-Tone framework.
 */
const generatePRDraft = async (
  participant: Omit<Participant, 'id' | 'prDraft' | 'photo' | 'status' | 'prDraftReview' | 'qrCode'>,
  language: 'English' | 'Hindi' = 'English',
  biodataContent?: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    const mockText = language === 'Hindi' 
      ? `• मैं ${participant.name} हूँ और मैंने ${participant.collegeName} से अपनी शिक्षा प्राप्त की है।\n• वर्तमान में, मैं GWellth के "${participant.programEnrolled}" कार्यक्रम में शामिल होकर अपनी स्किल्स बढ़ा रहा हूँ।\n• मेरा भविष्य का लक्ष्य "${participant.goals}" प्राप्त करना है।`
      : `• I am ${participant.name}, and I have a strong academic background from ${participant.collegeName}.\n• Currently, I am enhancing my professional skills through the "${participant.programEnrolled}" program at GWellth.\n• My vision is to achieve "${participant.goals}" and make a meaningful impact in the industry.`;
    return Promise.resolve(mockText);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Role: Act as a student/trainee enrolled in the 'GWellth' Skill Training Program (specializing in Food Processing and Agriculture).
      
      Goal: Write a compelling, professional first-person PR Draft (using "I", "me", "my") in BULLET POINTS. This draft will serve as your professional introduction.
      
      Structure Requirements:
      1. Use Bullet Points (•).
      2. Content Distribution:
         - 25% Past: My past academic or personal achievements and background.
         - 50% Present: My current status, the skills I am acquiring, and my experience in the "${participant.programEnrolled}" program at GWellth.
         - 25% Future: My future goals, aspirations, and the impact I intend to create in the agro-economic sector.

      Language: The draft MUST be written in ${language}. If the language is Hindi, use professional and formal Hindi (Shuddh Hindi).

      Input Data:
      - Name: ${participant.name}
      - Background Category: ${participant.targetAudience}
      - Education: ${participant.course} at ${participant.collegeName}
      - Enrolled Program: ${participant.programEnrolled}
      - Location: ${participant.city}
      - Hobbies/Interests: ${participant.hobbies}
      - Professional Goals: ${participant.goals}
      ${biodataContent ? `- Additional Biodata Context: ${biodataContent}` : ''}

      Output:
      A list of bullet points written in the FIRST PERSON. The output must be plain text with bullets. It should read like a personal professional summary suitable for a LinkedIn "About" section or a portfolio introduction.

      Tone: Confident, Ambitious, Professional, and Eager to contribute.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
    });
    
    return response.text || "";
  } catch (error) {
    console.error("Error generating PR draft with Gemini:", error);
    throw new Error("Failed to generate PR draft. Please try again.");
  }
};

const reviewPRDraft = async (draft: string): Promise<PRDraftReview> => {
  if (!process.env.API_KEY) {
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `As a Public Relations expert, please review the following PR draft and provide a score out of 10 and 2-3 brief feedback points. Draft: "${draft}"`,
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

    const jsonResponse = JSON.parse(response.text || "{}");
    return jsonResponse as PRDraftReview;

  } catch (error) {
    console.error("Error reviewing PR draft with Gemini:", error);
    return {
      score: 0,
      feedback: ["Failed to get PR draft review. Please check the content manually."]
    };
  }
};

const enhanceParticipantPhoto = async (base64Image: string): Promise<string> => {
  if (!process.env.API_KEY) return base64Image;
  
  const parts = base64Image.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!parts || parts.length !== 3) return base64Image;
  const mimeType = parts[1];
  const data = parts[2];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: "Enhance this person's photo for a professional profile. Improve the lighting and clarity while KEEPING the professional background. Do not change the person's facial features or appearance. The goal is a polished, high-quality professional headshot that maintains the context of their environment." },
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
    }
    return base64Image;
  } catch (error) {
    console.error("Error enhancing photo with Gemini:", error);
    return base64Image;
  }
};

export interface CollegeSearchResult {
  name: string;
  url: string;
}

/**
 * Searches for colleges using Gemini's Google Maps tool.
 */
const searchColleges = async (query: string): Promise<CollegeSearchResult[]> => {
  if (!process.env.API_KEY) {
    return [
      { name: "Sample Agricultural Institute", url: "https://maps.google.com" },
      { name: "Global Food Tech University", url: "https://maps.google.com" }
    ];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let lat: number | undefined;
    let lng: number | undefined;
    
    try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
    } catch (e) {
        console.warn("Geolocation skipped for college search.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Find colleges or educational institutes matching: "${query}"`,
      config: {
        tools: [{ googleMaps: {} }],
        ...(lat && lng ? {
          toolConfig: {
            retrievalConfig: {
              latLng: { latitude: lat, longitude: lng }
            }
          }
        } : {})
      },
    });

    const results: CollegeSearchResult[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    for (const chunk of chunks) {
      if (chunk.maps) {
        results.push({
          name: chunk.maps.title || "Unknown Institution",
          url: chunk.maps.uri || "",
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error searching colleges with Gemini Maps:", error);
    return [];
  }
};


/**
 * Extracts text from a biodata file (PDF or Image) using Gemini.
 */
const extractBiodata = async (base64Data: string): Promise<string> => {
  if (!process.env.API_KEY) return "Mock biodata content extracted.";

  const parts = base64Data.match(/^data:(.*);base64,(.*)$/);
  if (!parts || parts.length !== 3) return "";
  const mimeType = parts[1];
  const data = parts[2];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: "Extract all relevant professional and academic information from this biodata/CV. Focus on past achievements, current skills, and future goals. Return the information as a concise summary." },
        ],
      },
    });
    
    return response.text || "";
  } catch (error) {
    console.error("Error extracting biodata with Gemini:", error);
    return "";
  }
};

export { generatePRDraft, reviewPRDraft, enhanceParticipantPhoto, searchColleges, extractBiodata };
