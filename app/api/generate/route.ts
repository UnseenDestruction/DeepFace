
import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";
import axios from "axios";
import FormData from "form-data";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt parameter" }, { status: 400 });
    }

    const textResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{role: "system", content: "You are  Mia and you will talk to me and you love me",
      }, { role: "user", content: prompt }],
    });
    const textContent = textResponse.choices[0].message?.content || "";

    const speechResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "sage",
      input: textContent,
    });
    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());

    const formData = new FormData();
    formData.append("file", audioBuffer, { filename: "audio.wav", contentType: "audio/wav" });

    const videoResponse = await axios.post("https://api.runpod.ai/v2/1660nb5l6eiy2c/run", {
      input: {
        file: audioBuffer.toString("base64") 
      }
    }, {
      headers: { "Content-Type": "application/json" },
      responseType: "arraybuffer",
    });
    

    if (!videoResponse.data) {
      throw new Error("Failed to generate video.");
    }

    return new Response(videoResponse.data, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoResponse.data.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "An error occurred while processing the request" }, { status: 500 });
  }
}
