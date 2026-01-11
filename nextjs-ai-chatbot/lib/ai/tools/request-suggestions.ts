import { z } from "zod";
import { tool } from "ai";
import { saveSuggestions, getDocumentById } from "@/lib/db/queries";
import { Session } from "next-auth";

export const requestSuggestions = ({
  session,
  dataStream,
}: {
  session: Session | null;
  dataStream: any;
}) =>
  tool({
    description: "Request suggestions for a document",
    parameters: z.object({
      documentId: z
        .string()
        .describe("The ID of the document to suggest changes for"),
      suggestions: z.array(
        z.object({
          originalText: z.string().describe("The original text selection"),
          suggestedText: z.string().describe("The suggested replacement text"),
          description: z
            .string()
            .optional()
            .describe("Reason for the suggestion"),
        })
      ),
    }),
    execute: async ({
      documentId,
      suggestions,
    }: {
      documentId: string;
      suggestions: any[];
    }) => {
      if (!session || !session.user || !session.user.id) {
        throw new Error("Unauthorized");
      }

      const document = await getDocumentById({ id: documentId });

      if (!document) {
        throw new Error("Document not found");
      }

      const userId = session.user.id;
      const suggestionsWithIds = suggestions.map((suggestion) => ({
        ...suggestion,
        id: crypto.randomUUID(),
        documentId,
        documentCreatedAt: document.createdAt,
        userId: userId!,
        createdAt: new Date(),
        isResolved: false,
        description: suggestion.description || null,
      }));

      await saveSuggestions({
        suggestions: suggestionsWithIds,
      });

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: "Suggestions added",
      };
    },
  } as any);
