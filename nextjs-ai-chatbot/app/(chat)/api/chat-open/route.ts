import { convertToModelMessages, streamText, UIMessage } from "ai";
import { z } from "zod";

import { myProvider, models } from "@/lib/ai/models";
import { systemPrompt } from "@/lib/ai/prompts";
import {
  convertToUIMessages,
  generateUUID,
  getMostRecentUserMessage,
} from "@/lib/utils";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      modelId,
    }: { id: string; messages: Array<UIMessage>; modelId: string } =
      await request.json();
    console.log(">> Messages:", messages);

    const model = models.find((m) => m.id === modelId) || models[0];
    const coreMessages = await convertToModelMessages(messages);
    const userMessageId = generateUUID();

    const result = streamText({
      model: myProvider.languageModel(model.apiIdentifier),
      system: systemPrompt,
      messages: coreMessages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate response" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export async function GET() {
  return new Response("Ready", { status: 200 });
}
