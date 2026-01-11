// eslint-disable import/no-unresolved
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { z } from "zod";

import { myProvider } from "@/lib/ai/models";

import { systemPrompt } from "@/lib/ai/prompts";
import { auth } from "@/app/(auth)/auth";
import {
  convertToUIMessages,
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";
import {
  getChatById,
  saveChat,
  saveMessages,
  saveSuggestions,
  deleteChatById,
} from "@/lib/db/queries";

import { generateTitleFromUserMessage } from "../../actions";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { getWeather } from "@/lib/ai/tools/get-weather";

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<UIMessage>; modelId: string } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = await convertToModelMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [
      {
        ...userMessage,
        id: generateUUID(),
        createdAt: new Date(),
        chatId: id,
      },
    ],
  });

  const toolDefinitions =
    modelId === "chat-model-reasoning"
      ? {}
      : {
          getWeather,
          requestSuggestions: requestSuggestions({
            session,
            dataStream: null, // Removed dataStream usage, passing null or undefined
          }),
        };

  const result = streamText({
    model: myProvider.languageModel(modelId),
    system: systemPrompt,
    messages: coreMessages,
    ...(modelId === "chat-model-reasoning" ? {} : { maxSteps: 5 }),
    tools: toolDefinitions as any,
    onFinish: async ({ response }) => {
      if (session.user?.id) {
        try {
          const sanitizedResponseMessages = sanitizeResponseMessages(
            response.messages
          );

          await saveMessages({
            messages: sanitizedResponseMessages.map((message) => {
              return {
                id: generateUUID(),
                chatId: id,
                role: message.role,
                content: message.content,
                createdAt: new Date(),
              };
            }),
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  // Note: user-message-id injection removed for now due to StreamData unavailability in v6 check
  return (result as any).toDataStreamResponse();
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
