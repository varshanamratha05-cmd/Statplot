import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Since this is a client-side demo
});

/**
 * Sends a sample of the data to OpenAI to get high-level insights.
 * @param {Array} dataSample - A slice of the dataset (e.g. first 50 rows).
 */
export const getAIInsights = async (dataSample) => {
  if (!apiKey) {
    throw new Error("OpenAI API Key is missing. Please configure VITE_OPENAI_API_KEY in .env");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective and fast
      messages: [
        {
          role: "system",
          content: "You are a senior data scientist and statistical expert. Analyze the provided dataset sample and provide 3-4 concise, high-level insights or anomalies. Be professional, technical, and precise. Format as a short paragraph."
        },
        {
          role: "user",
          content: `Here is a sample of the data (JSON format): \n${JSON.stringify(dataSample)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI Error:", error);
    return "Error generating AI insights. Check console for details.";
  }
};
