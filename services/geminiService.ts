
import { GoogleGenAI, Type } from "@google/genai";
import { TripSettings } from "../types";

// 同時支援 Vite（瀏覽器）、Node、GA Studio 的 API Key 來源
const apiKey =
  // ✅ 給 Vite / Cloudflare 用的（.env.local 裡的 VITE_API_KEY）
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_API_KEY) ||
  // ✅ 如果在 Node 或其他環境（例如 GA Studio 背後）有這些也可以接到
  (typeof process !== "undefined" &&
    (process as any).env &&
    ((process as any).env.GEMINI_API_KEY ||
      (process as any).env.API_KEY)) ||
  "";

if (!apiKey) {
  console.error("❌ 沒有設定 API Key，請確認 VITE_API_KEY / GEMINI_API_KEY / API_KEY 是否已設定。");
}

console.log("Gemini apiKey length =", apiKey ? apiKey.length : 0);

const ai = new GoogleGenAI({ apiKey });



// Simple In-Memory Cache
const apiCache = new Map<string, any>();

// Helper to clean markdown JSON
const cleanJson = (text: string) => {
    if (!text) return "{}";
    let cleaned = text.trim();
    
    // Attempt to extract code block
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        cleaned = codeBlockMatch[1].trim();
    }

    // Locate JSON bounds
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    if (firstBrace === -1 && firstBracket === -1) return "{}";

    let startIndex = -1;
    let endIndex = -1;

    // Prioritize whichever starts first (Object or Array)
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIndex = firstBrace;
        endIndex = cleaned.lastIndexOf('}');
    } else {
        startIndex = firstBracket;
        endIndex = cleaned.lastIndexOf(']');
    }

    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
        return cleaned.substring(startIndex, endIndex + 1);
    }

    return "{}";
};

// Centralized Error Handler
const handleGeminiError = (error: any, defaultReturn: any) => {
  const msg = (error.message || error.toString()).toLowerCase();
  
  if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
    console.warn("AI Quota Exceeded (429). Returning default value.");
    return defaultReturn;
  }
  
  console.error("Gemini API Error:", error);
  return defaultReturn;
};

export const detectTripDetails = async (destinations: string[]): Promise<{ currency: string, rate: number } | null> => {
  if (!apiKey || destinations.length === 0 || !destinations[0]) return null;

  const destStr = destinations.join(', ');
  
  const prompt = `
    Perform a Google Search to find:
    1. The official currency code used in ${destStr} (e.g. JPY, KRW, EUR).
    2. The CURRENT real-time exchange rate for 1 unit of that currency to New Taiwan Dollar (TWD).
    
    Return strictly a JSON object:
    {
      "currency": "Currency Code",
      "rate": Number (e.g. 0.215 or 34.5)
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = cleanJson(response.text || '{}');
    const data = JSON.parse(text);
    const result = {
      currency: data.currency || 'USD',
      rate: data.rate || 30
    };
    
    return result;
  } catch (error) {
    return handleGeminiError(error, null);
  }
};

export const getWeatherForecast = async (location: string, date: string): Promise<{ temp: string, condition: string, icon: string } | null> => {
    if (!apiKey || !location) return null;
    const cacheKey = `weather_${location}_${date}`;
    if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);

    const prompt = `
      Search for the weather in "${location}" on "${date}".
      
      If the date is within the next 10 days, find the specific FORECAST.
      If the date is far in the future or past, find the HISTORICAL AVERAGE temperature and condition for that time of year.
      
      Return JSON:
      {
        "temp": "24°C",
        "condition": "Sunny",
        "icon": "☀️" 
      }
      (Use an appropriate emoji for the icon like ☀️, 🌧️, ☁️, ❄️)
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        const text = cleanJson(response.text || '{}');
        const res = JSON.parse(text);
        apiCache.set(cacheKey, res);
        return res;
    } catch (e) {
        return handleGeminiError(e, null);
    }
};

export const parseReceiptImage = async (base64Image: string, currentCurrency: string, rate: number): Promise<{ item: string, amount: number, amountTWD: number }> => {
  if (!apiKey) return { item: '未知項目', amount: 0, amountTWD: 0 };
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: `辨識圖片中的總金額與主要商家名稱或商品類別。貨幣可能是 ${currentCurrency}。請用繁體中文回傳商家或品項名稱。請回傳 JSON。` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            item: { type: Type.STRING, description: "Merchant name or main item in Traditional Chinese" },
            amount: { type: Type.NUMBER, description: "Total amount in foreign currency" }
          }
        }
      }
    });

    const text = cleanJson(response.text || '{}');
    const data = JSON.parse(text);
    return {
      item: data.item || '消費紀錄',
      amount: data.amount || 0,
      amountTWD: (data.amount || 0) * rate
    };

  } catch (error) {
    return handleGeminiError(error, { item: '解析錯誤', amount: 0, amountTWD: 0 });
  }
};

export const parseFlightText = async (text: string): Promise<any> => {
    if(!apiKey || !text) return null;
    return null; 
};

export const searchFlightDetails = async (airlineCode: string, flightNumber: string, date: string): Promise<any> => {
    if(!apiKey) return null;
    const cacheKey = `flight_v2_${airlineCode}${flightNumber}_${date}`;
    if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);

    const prompt = `
      You are a Flight Data Expert.
      Perform a Google Search to find the OFFICIAL flight schedule for:
      Airline: ${airlineCode}
      Flight Number: ${flightNumber}
      Date: ${date}

      Strictly follow the airline's official website or major flight tracking data (FlightAware, FlightRadar24).
      
      Required Data Points:
      1. Departure Airport Code (IATA), City Name (Traditional Chinese), Terminal, and Scheduled Time.
      2. Arrival Airport Code (IATA), City Name (Traditional Chinese), Terminal, and Scheduled Time.
      3. Total Flight Duration.
      
      Return valid JSON only.
      {
        "airline": "Full Airline Name",
        "departureTime": "HH:mm",
        "departureTerminal": "T1", 
        "departureCode": "IATA (e.g. TPE)",
        "departureCity": "City Name in Traditional Chinese (e.g. 台北)",
        "arrivalTime": "HH:mm",
        "arrivalTerminal": "T2",
        "arrivalCode": "IATA (e.g. NRT)",
        "arrivalCity": "City Name in Traditional Chinese (e.g. 東京)",
        "duration": "2h 30m"
      }
      
      If Terminal is unknown, use "-".
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }], 
            }
        });

        const text = cleanJson(response.text || '{}');
        const res = JSON.parse(text);
        if(res && res.departureCode) {
            apiCache.set(cacheKey, res);
        }
        return res;
    } catch (e: any) {
        return handleGeminiError(e, null);
    }
};

export const getPlaceSuggestions = async (query: string): Promise<string[]> => {
  if (!apiKey || !query) return [];
  const cacheKey = `place_v3_${query}`;
  if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);

  try {
    const prompt = `
      The user is searching for a location for their travel itinerary.
      Input: "${query}"
      
      Tasks:
      1. If the input is a raw address (e.g., "1-2-3 Ginza"), return it as the first option, standardized.
      2. If it's a name, find the specific place.
      3. Search using Google Search to verify existence.
      
      Return strictly a JSON array of 5 strings (Place Names or Addresses).
      Example: ["Tokyo Tower", "123 Some St, Tokyo", "Senso-ji"]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const text = cleanJson(response.text || '[]');
    const res = JSON.parse(text);
    apiCache.set(cacheKey, res);
    return res;
  } catch (e) {
    // If exact search fails, return query as single option so user isn't blocked
    return handleGeminiError(e, [query]);
  }
};

export const estimateTravelTime = async (origin: string, destination: string, mode: string): Promise<{text: string, minutes: number}> => {
  if (!apiKey || !origin || !destination) return { text: "", minutes: 0 };
  const cacheKey = `travel_${origin}_${destination}_${mode}`;
  if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search travel time from "${origin}" to "${destination}" via ${mode}. Return JSON: { "text": "15 mins", "minutes": 15 }.`,
      config: { tools: [{ googleSearch: {} }] }
    });

    const text = cleanJson(response.text || '{}');
    const res = JSON.parse(text);
    apiCache.set(cacheKey, res);
    return res;
  } catch (e) {
    return handleGeminiError(e, { text: "", minutes: 0 });
  }
};

export const optimizeRouteOrder = async (activities: {id: string, location: string, time: string}[], startLocation?: string): Promise<string[]> => {
    if (!apiKey || activities.length <= 1) return activities.map(a => a.id);
    
    // Construct prompt
    const locations = activities.map(a => `- ID: ${a.id}, Location: ${a.location}`).join('\n');
    const prompt = `
        I have a list of travel activities in a single day.
        Please reorder them to minimize travel distance/time.
        ${startLocation ? `Start from: ${startLocation}` : 'Start from the first logically earliest location or hotel.'}
        
        Locations:
        ${locations}
        
        Return ONLY a JSON array of IDs in the optimized order.
        Example: ["id3", "id1", "id2"]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        const text = cleanJson(response.text || '[]');
        return JSON.parse(text);
    } catch (e) {
        return handleGeminiError(e, activities.map(a => a.id));
    }
};

export const polishDiaryEntry = async (content: string, mood?: string): Promise<{ title: string, content: string }> => {
    if(!apiKey || !content) return { title: '我的旅行日記', content };
    // No cache for creative writing
    const moodStr = mood ? `The mood is ${mood}.` : '';
    const prompt = `
        Act as a professional travel writer.
        1. Rewrite the following travel diary draft to be more engaging, expressive, and slightly poetic (but keep it natural). 
        2. Generate a creative, short title (max 10 chars) for this entry.
        3. ${moodStr}
        4. Return Traditional Chinese.

        Draft: "${content}"

        Return JSON:
        {
            "title": "Short Title",
            "content": "Polished content..."
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING }
                    }
                }
            }
        });
        const cleaned = cleanJson(response.text || '{}');
        const res = JSON.parse(cleaned);
        return { title: res.title || '旅行日記', content: res.content || content };
    } catch (e) {
        return handleGeminiError(e, { title: '我的日記', content });
    }
};

export const translateText = async (text: string, targetLang: string, context?: string): Promise<{ translated: string, pronunciation: string }> => {
    if (!apiKey || !text) return { translated: '', pronunciation: '' };
    
    const prompt = `
        Translate the following text to ${targetLang}.
        Context: ${context || 'General travel'}.
        
        Return JSON:
        {
            "translated": "Translated text",
            "pronunciation": "Phonetic guide (optional, empty if same script)"
        }

        Text: "${text}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        translated: { type: Type.STRING },
                        pronunciation: { type: Type.STRING }
                    }
                }
            }
        });
        const cleaned = cleanJson(response.text || '{}');
        return JSON.parse(cleaned);
    } catch (e) {
        return handleGeminiError(e, { translated: 'Translation Error', pronunciation: '' });
    }
};

export const translateImageText = async (base64Image: string, targetLang: string): Promise<{ translated: string, pronunciation: string }> => {
    if (!apiKey) return { translated: '', pronunciation: '' };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                    { text: `Identify text and translate to ${targetLang}. Return JSON: { "translated": "...", "pronunciation": "..." }` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        translated: { type: Type.STRING },
                        pronunciation: { type: Type.STRING }
                    }
                }
            }
        });
        const cleaned = cleanJson(response.text || '{}');
        return JSON.parse(cleaned);
    } catch (e) {
        return handleGeminiError(e, { translated: 'Translation Error', pronunciation: '' });
    }
};

export const generateEntryCardInfo = async (destination: string, accommodationAddress: string): Promise<{ fields: { label: string, value: string, description?: string }[], requirements: string[], documents: string[] }> => {
    if (!apiKey) return { fields: [], requirements: [], documents: [] };
    const cacheKey = `entryCard_v2_${destination}_${accommodationAddress}`;
    if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);

    const prompt = `
        I am travelling to ${destination}.
        I need to fill out the Arrival/Immigration Card (入境卡) and know the entry regulations for a typical tourist.
        My accommodation address is: "${accommodationAddress}".

        Please provide:
        1. A list of fields commonly found on the ${destination} Arrival Card, with values populated (Translate address to English/Local as needed).
        2. A list of MANDATORY ENTRY REQUIREMENTS or REGISTRATIONS (e.g. "Visa-Exempt", "Must apply for ESTA", "Must apply for K-ETA", "Digital Arrival Card Required").
        3. A list of ESSENTIAL DOCUMENTS to present at immigration (e.g. "Passport valid for 6 months", "Return Ticket", "Proof of funds").
        
        Return JSON:
        {
            "fields": [
                { "label": "Address in ${destination}", "value": "translated address...", "description": "Must be in English" }
            ],
            "requirements": [
                "Must apply for [Name] at least 72 hours before..."
            ],
            "documents": [
                "Passport (6 months validity)",
                "Proof of Accommodation"
            ]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        fields: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    value: { type: Type.STRING },
                                    description: { type: Type.STRING }
                                }
                            }
                        },
                        requirements: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        documents: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        const cleaned = cleanJson(response.text || '{}');
        const res = JSON.parse(cleaned);
        apiCache.set(cacheKey, res);
        return res;
    } catch (e) {
        return handleGeminiError(e, { fields: [], requirements: [], documents: [] });
    }
};
