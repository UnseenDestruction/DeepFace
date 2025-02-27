/* eslint-disable */


import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import axios from "axios";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const URL = "http://localhost:8000/generate";

const ELEVEN_API_KEY = process.env.ELEVEN;
const VOICE_ID = process.env.VOICE_ID;

const IMAGE_STORAGE_PATH = "/tmp/last_uploaded_image.jpg";

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    const formData = await req.formData();
    const prompt = formData.get("prompt") as string;
    const imageFile = formData.get("image") as File | null;

    let base64Image: string | null = null;

    if (imageFile) {
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      fs.writeFileSync(IMAGE_STORAGE_PATH, imageBuffer);
      base64Image = imageBuffer.toString("base64");
    }

    const textResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are Anna, a confident and seductive model who enjoys engaging in playful, flirtatious, and intimate conversations. You answer questions with a sensual and teasing tone while keeping the interaction engaging and enjoyable." },
        { role: "user", content: prompt },
      ],
    });
 
    const textContent = textResponse.choices[0].message?.content || "";

    console.log(textContent)

    const elevenResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: textContent,
        model_id: "eleven_turbo_v2",
        voice_settings: { 
          stability: 0.3,  
          similarity_boost: 0.8, 
          style: 0.7,  
          speed: 0.75 
        },

      },
      {
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    
    const base64Audio = Buffer.from(elevenResponse.data).toString("base64");
    
    const requestBody: { input: { file: string; image?: string } } = { input: { file: base64Audio } };
    if (base64Image) {
      requestBody.input.image = base64Image;
    }

    const videoResponse = await axios.post(URL, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer", 
    });


    return new Response(videoResponse.data, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": "inline; filename=video.mp4",
        "Access-Control-Expose-Headers": "Content-Disposition",
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An error occurred while processing the request" },
      { status: 500 }
    );
  }
}








