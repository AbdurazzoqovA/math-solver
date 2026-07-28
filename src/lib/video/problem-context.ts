import type { Message } from "@/components/chat/MessageList";

export function getProblemForAssistantMessage(
  messages: Message[],
  assistantMessageId: string,
): string | null {
  const assistantIndex = messages.findIndex(
    (message) =>
      message.id === assistantMessageId && message.role === "assistant",
  );
  if (assistantIndex <= 0) return null;

  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;

    const ocrText = message.images
      ?.map((image) => image.ocrText.trim())
      .filter(Boolean)
      .join("\n\n");
    const typed = message.content.trim();
    if (
      ocrText &&
      (!typed || typed === "Solve the above math problem.")
    ) {
      return ocrText;
    }
    if (typed && ocrText) {
      return `${typed}\n\nProblem context:\n${ocrText}`;
    }
    return typed || ocrText || null;
  }
  return null;
}
