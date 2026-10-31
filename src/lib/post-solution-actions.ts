import { LANGUAGES } from "./i18n/locales.ts";
import { messages } from "./i18n/messages.ts";

const stepLabels = LANGUAGES.map(({ step }) => step.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const STEP_HEADER_PATTERN = new RegExp(
  `^(?:#{1,6}\\s*)?(?:\\*\\*)?(?:${stepLabels.join("|")})\\s*(\\d+)\\s*(?::|\\.)?(?:\\*\\*)?`,
  "gim",
);

export function getSolutionStepNumbers(content: string): number[] {
  const stepNumbers: number[] = [];
  const seen = new Set<number>();

  for (const match of content.matchAll(STEP_HEADER_PATTERN)) {
    const stepNumber = Number(match[1]);
    if (
      Number.isInteger(stepNumber) &&
      stepNumber > 0 &&
      !seen.has(stepNumber)
    ) {
      seen.add(stepNumber);
      stepNumbers.push(stepNumber);
    }
  }

  return stepNumbers;
}

export function buildStepExplanationPrompt(stepNumber: number): string {
  return [
    `Explain Step ${stepNumber} from your previous solution in more detail.`,
    "Show why the step is valid, unpack the rule or transformation used,",
    "and keep the explanation connected to the same problem.",
  ].join(" ");
}

export const SIMILAR_PROBLEM_PROMPT = [
  "Give me one similar practice problem at the same difficulty.",
  "Do not reveal the solution yet—let me try it first, then check my work.",
].join(" ");

export function isActionableSolution(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    !Object.values(messages).some(({ solveError }) => solveError.toLowerCase() === normalized) &&
    !normalized.startsWith("sorry, i encountered an error")
  );
}
