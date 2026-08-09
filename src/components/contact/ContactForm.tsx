"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { useTurnstile } from "@/components/providers/TurnstileProvider";
import {
  CONTACT_FIELD_LIMITS,
  type ContactFieldErrors,
} from "@/lib/contact";

type SubmitState = "idle" | "submitting" | "success";

export default function ContactForm() {
  const { getToken } = useTurnstile();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === "submitting") return;

    setSubmitState("submitting");
    setError("");
    setFieldErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          email: formData.get("email"),
          message: formData.get("message"),
          website: formData.get("website"),
          captchaToken: getToken(),
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | {
            accepted?: unknown;
            error?: unknown;
            fieldErrors?: ContactFieldErrors;
          }
        | null;

      if (!response.ok || result?.accepted !== true) {
        if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
        setError(
          typeof result?.error === "string"
            ? result.error
            : "Your message could not be sent. Please try again.",
        );
        setSubmitState("idle");
        return;
      }

      form.reset();
      setSubmitState("success");
    } catch {
      setError("Your message could not be sent. Check your connection and try again.");
      setSubmitState("idle");
    }
  }

  if (submitState === "success") {
    return (
      <div
        className="flex min-h-[28rem] flex-col items-start justify-center rounded-2xl border border-primary-200 bg-primary-50/70 p-7 dark:border-primary-900 dark:bg-primary-950/30 sm:p-10"
        role="status"
        aria-live="polite"
      >
        <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Message sent
        </h2>
        <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
          Thanks for getting in touch. We will reply to the email address you provided.
        </p>
        <button
          type="button"
          onClick={() => setSubmitState("idle")}
          className="mt-8 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:translate-y-px"
        >
          Send another message
        </button>
      </div>
    );
  }

  const inputClassName =
    "w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-base text-foreground shadow-sm outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground/80 focus:border-primary-500 focus:bg-background focus:ring-4 focus:ring-primary-500/15 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_rgba(37,99,235,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-8"
      noValidate
    >
      <div className="grid gap-6">
        <div className="grid gap-2">
          <label htmlFor="firstName" className="text-sm font-semibold text-foreground">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            maxLength={CONTACT_FIELD_LIMITS.firstName}
            required
            disabled={submitState === "submitting"}
            aria-invalid={Boolean(fieldErrors.firstName)}
            aria-describedby={fieldErrors.firstName ? "firstName-error" : undefined}
            className={inputClassName}
          />
          {fieldErrors.firstName && (
            <p id="firstName-error" className="text-sm font-medium text-rose-700 dark:text-rose-300">
              {fieldErrors.firstName}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-semibold text-foreground">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={CONTACT_FIELD_LIMITS.email}
            required
            disabled={submitState === "submitting"}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : "email-help"}
            className={inputClassName}
          />
          {fieldErrors.email ? (
            <p id="email-error" className="text-sm font-medium text-rose-700 dark:text-rose-300">
              {fieldErrors.email}
            </p>
          ) : (
            <p id="email-help" className="text-sm text-muted-foreground">
              We will only use this address to reply to your message.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <label htmlFor="message" className="text-sm font-semibold text-foreground">
            How can we help?
          </label>
          <textarea
            id="message"
            name="message"
            rows={7}
            maxLength={CONTACT_FIELD_LIMITS.message}
            required
            disabled={submitState === "submitting"}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={fieldErrors.message ? "message-error" : "message-help"}
            className={`${inputClassName} min-h-44 resize-y leading-relaxed`}
          />
          {fieldErrors.message ? (
            <p id="message-error" className="text-sm font-medium text-rose-700 dark:text-rose-300">
              {fieldErrors.message}
            </p>
          ) : (
            <p id="message-help" className="text-sm text-muted-foreground">
              Include any details that will help us understand your question.
            </p>
          )}
        </div>

        <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {error && (
          <p
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitState === "submitting"}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 active:translate-y-px sm:w-auto sm:justify-self-start"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitState === "submitting" ? "Sending..." : "Send message"}
        </button>
      </div>
    </form>
  );
}
