"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChatConversation } from "@/components/chat/ChatArea";
import { useChatContext } from "@/context/ChatContext";
import type {
  CalculatorExample,
  CalculatorTool,
} from "@/lib/calculators";
import CalculatorSolver from "./CalculatorSolver";
import GraphingCalculator from "./GraphingCalculator";

type CalculatorExperienceProps = {
  calculator: {
    slug: string;
    name: string;
    heading: string;
    heroDescription: string;
    placeholder: string;
    inputHint?: string;
    tool?: CalculatorTool;
    examples: CalculatorExample[];
  };
  children: ReactNode;
};

export default function CalculatorExperience({
  calculator,
  children,
}: CalculatorExperienceProps) {
  const {
    messages,
    isLoading,
    sendMessage,
    activeChatId,
    activeChatSource,
  } = useChatContext();
  const isCalculatorChat =
    activeChatId !== null &&
    messages.length > 0 &&
    activeChatSource === `calculator:${calculator.slug}`;

  const startCalculatorChat = (
    value: string,
    images?: { url: string; ocrText: string }[],
  ) => {
    void sendMessage(value, images, {
      forceNewChat: true,
      source: `calculator:${calculator.slug}`,
    });
  };

  if (isCalculatorChat) {
    return (
      <ChatConversation
        messages={messages}
        isLoading={isLoading}
        activeChatId={activeChatId}
        onSubmit={sendMessage}
      />
    );
  }

  return (
    <article className="w-full bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <Link className="transition-colors hover:text-foreground" href="/">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            className="transition-colors hover:text-foreground"
            href="/calculator"
          >
            Calculators
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-foreground">
            {calculator.name}
          </span>
        </nav>

        <header className="flex flex-col items-center text-center">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {calculator.heading}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            {calculator.heroDescription}
          </p>

          <section
            aria-label={`${calculator.name} input`}
            className="mt-10 w-full text-left"
          >
            {calculator.tool?.kind === "graphing" ? (
              <GraphingCalculator
                initialExpressions={calculator.tool.initialExpressions}
                examples={calculator.examples}
                onExplain={startCalculatorChat}
              />
            ) : (
              <CalculatorSolver
                slug={calculator.slug}
                placeholder={calculator.placeholder}
                inputHint={calculator.inputHint}
                examples={calculator.examples}
                onSubmit={startCalculatorChat}
              />
            )}
          </section>
        </header>

        {children}
      </div>
    </article>
  );
}
