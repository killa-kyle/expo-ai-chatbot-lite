import type {
  AssistantModelMessage,
  ModelMessage,
  ToolModelMessage,
  UIToolInvocation,
  UIMessage,
} from "ai";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Message as DBMessage, Document } from "@/lib/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      "An error occurred while fetching the data."
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: ToolModelMessage;
  messages: Array<UIMessage>;
}): Array<UIMessage> {
  return messages.map((message) => {
    if ((message as any).toolInvocations) {
      return {
        ...message,
        toolInvocations: (message as any).toolInvocations.map(
          (toolInvocation: any) => {
            const toolResult = toolMessage.content.find(
              (tool) => (tool as any).toolCallId === toolInvocation.toolCallId
            );

            if (toolResult) {
              return {
                ...toolInvocation,
                state: "result",
                result: (toolResult as any).result,
              };
            }

            return toolInvocation;
          }
        ),
      };
    }

    return message;
  });
}

export function convertToUIMessages(
  messages: Array<ModelMessage>
): Array<UIMessage> {
  return messages.reduce((chatMessages: Array<UIMessage>, message) => {
    if (message.role === "tool") {
      return addToolMessageToChat({
        toolMessage: message as ToolModelMessage,
        messages: chatMessages,
      });
    }

    let textContent = "";
    let toolInvocations: Array<any> = [];

    if (typeof message.content === "string") {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      textContent = message.content
        .filter((content) => content.type === "text")
        .map((content) => content.text)
        .join("");

      toolInvocations = message.content
        .filter((content) => content.type === "tool-call")
        .map((content) => ({
          state: "call",
          toolCallId: content.toolCallId,
          toolName: content.toolName,
          args: (content as any).args,
        }));
    }
    return [
      ...chatMessages,
      {
        id: (message as any).id || generateUUID(),
        role: message.role,
        content: textContent,
        toolInvocations,
        parts: [], // Satisfy UIMessage type requirement for parts
      } as unknown as UIMessage,
    ];
  }, []);
}

export function sanitizeResponseMessages(
  messages: Array<ToolModelMessage | AssistantModelMessage>
): Array<ToolModelMessage | AssistantModelMessage> {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === "tool") {
      for (const content of message.content) {
        if (content.type === "tool-result") {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== "assistant") return message;

    if (typeof message.content === "string") return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === "tool-call"
        ? toolResultIds.includes(content.toolCallId)
        : content.type === "text"
        ? content.text.length > 0
        : true
    );

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0
  );
}

export function sanitizeUIMessages(
  messages: Array<UIMessage>
): Array<UIMessage> {
  const messagesBySanitizedToolInvocations = messages.map((message) => {
    if (message.role !== "assistant") return message;

    if (!(message as any).toolInvocations) return message;

    const toolResultIds: Array<string> = [];

    for (const toolInvocation of (message as any).toolInvocations) {
      if (toolInvocation.state === "result") {
        toolResultIds.push(toolInvocation.toolCallId);
      }
    }

    const sanitizedToolInvocations = (
      (message as any).toolInvocations as any[]
    ).filter(
      (toolInvocation) =>
        toolInvocation.state === "result" ||
        toolResultIds.includes(toolInvocation.toolCallId)
    );

    return {
      ...message,
      toolInvocations: sanitizedToolInvocations,
    };
  });

  return messagesBySanitizedToolInvocations.filter(
    (message) =>
      (message as any).content.length > 0 ||
      ((message as any).toolInvocations &&
        (message as any).toolInvocations.length > 0)
  );
}

export function getMostRecentUserMessage(messages: Array<ModelMessage>) {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getMessageIdFromAnnotations(message: UIMessage) {
  if (!(message as any).annotations) return message.id;

  const [annotation] = (message as any).annotations;
  if (!annotation) return message.id;

  return (annotation as any).messageIdFromServer;
}
