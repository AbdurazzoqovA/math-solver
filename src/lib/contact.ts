export const CONTACT_FIELD_LIMITS = {
  firstName: 80,
  email: 254,
  message: 3_000,
} as const;

export type ContactSubmission = {
  firstName: string;
  email: string;
  message: string;
};

export type ContactFieldErrors = Partial<
  Record<keyof ContactSubmission, string>
>;

export type ContactSubmissionResult =
  | { ok: true; value: ContactSubmission }
  | { ok: false; errors: ContactFieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSingleLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function parseContactSubmission(
  input: unknown,
): ContactSubmissionResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      errors: {
        firstName: "Enter your first name.",
        email: "Enter your email address.",
        message: "Enter a message.",
      },
    };
  }

  const record = input as Record<string, unknown>;
  const firstName =
    typeof record.firstName === "string"
      ? normalizeSingleLine(record.firstName)
      : "";
  const email =
    typeof record.email === "string"
      ? normalizeSingleLine(record.email)
      : "";
  const message =
    typeof record.message === "string"
      ? record.message.replaceAll("\u0000", "").trim()
      : "";
  const errors: ContactFieldErrors = {};

  if (!firstName) {
    errors.firstName = "Enter your first name.";
  } else if (firstName.length > CONTACT_FIELD_LIMITS.firstName) {
    errors.firstName = `Keep your first name under ${CONTACT_FIELD_LIMITS.firstName} characters.`;
  }

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (
    email.length > CONTACT_FIELD_LIMITS.email ||
    !EMAIL_PATTERN.test(email)
  ) {
    errors.email = "Enter a valid email address.";
  }

  if (!message) {
    errors.message = "Enter a message.";
  } else if (message.length > CONTACT_FIELD_LIMITS.message) {
    errors.message = `Keep your message under ${CONTACT_FIELD_LIMITS.message.toLocaleString("en-US")} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { firstName, email, message },
  };
}

export function formatTelegramContactMessage({
  firstName,
  email,
  message,
}: ContactSubmission) {
  return [
    "New MathSolver contact message",
    "",
    `First name: ${firstName}`,
    `Email: ${email}`,
    "",
    "Message:",
    message,
  ].join("\n");
}
