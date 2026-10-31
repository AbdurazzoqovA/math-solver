// Provider-neutral schemas. Keep the public HTTP response shapes unchanged.
const text = { type: "string" };
const nullableText = { anyOf: [text, { type: "null" }] };
const strings = { type: "array", items: text };
const object = (properties: Record<string, unknown>) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false,
});

export const PRACTICE_SCHEMA = object({
  title: text,
  questions: {
    type: "array", minItems: 1,
    items: object({
      question: text,
      options: strings,
      correctAnswerIndex: { type: "integer", enum: [0, 1, 2, 3] },
    }),
  },
});

export const PRACTICE_STEPS_SCHEMA = object({
  steps: { type: "array", minItems: 1, items: object({ title: text, explanation: text }) },
});

export const WORK_CHECK_SCHEMA = object({
  status: { type: "string", enum: ["correct", "has_mistake", "unclear"] },
  problem: text,
  summary: text,
  confidence: { type: "number" },
  firstMistakeIndex: { anyOf: [{ type: "integer" }, { type: "null" }] },
  nextHint: text,
  correctedResult: nullableText,
  lines: {
    type: "array", minItems: 1,
    items: object({
      index: { type: "integer" }, transcription: text,
      status: { type: "string", enum: ["correct", "incorrect", "unclear"] },
      explanation: text, correction: nullableText,
    }),
  },
});

export const SOLUTION_VERIFICATION_SCHEMA = object({
  status: { type: "string", enum: ["checked", "warning", "inconclusive"] },
  confidence: { type: "number" }, summary: text, finalAnswer: nullableText, issues: strings,
});
