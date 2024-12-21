import { GenerateContentRequest, GoogleGenerativeAI, Part } from '@google/generative-ai';

export const googleapi = async (
  prompt: string | GenerateContentRequest | (string | Part)[],
  apiKey: string,
  gptVersion: string
) => {
  try {
    const API_KEY = apiKey;
    const client = new GoogleGenerativeAI(API_KEY);
    const model = client.getGenerativeModel({ model: gptVersion });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text ? response.text() : 'No text returned';
    return text;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    return 'Error';
  }
};
