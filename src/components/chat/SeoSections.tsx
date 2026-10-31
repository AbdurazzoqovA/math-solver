import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calculator, Camera, BookOpen, LineChart, Zap, MessageCircle, ScanLine, CircleCheckBig, Clapperboard } from "lucide-react";
import MobileAppLinks from "@/components/marketing/MobileAppLinks";
import { getLandingCopy } from "@/lib/i18n/landing";
import type { Locale } from "@/lib/i18n/locales";
import { aiDetectorLink } from "@/lib/i18n/external-links";

const popularPaths = ["/calculator/solve-for-x", "/calculator/graphing", "/calculator/quadratic-equation", "/calculator/factoring", "/calculator/fraction", "/calculator/systems-of-equations", "/calculator/inequalities", "/calculator/logarithms", "/calculator/derivative", "/calculator/integral", "/calculator/matrix", "/calculator/determinant", "/calculator/trig-identities", "/calculator/standard-deviation"];

export default function SeoSections({ locale }: { locale: Locale }) {
  const copy = getLandingCopy(locale);
  const detector = aiDetectorLink(locale);
  const popularCalculators = copy.popularCalculators.map((item, index) => ({ ...item, href: popularPaths[index] }));
  return (
    <div className="w-full px-4 relative z-10 mt-8 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
      
      {/* Block 1: What makes MathSolver different */}
      <div className="flex justify-center">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">{copy.introTitle}</h2>
          <div className="flex text-gray-500 dark:text-zinc-400 flex-col gap-4 mt-5 leading-relaxed">
            <p>{copy.introParagraphs[0]}</p>
            <p>{copy.introParagraphs[1]}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-16">
        <div className="w-full max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">{copy.calculatorsTitle}</h2>
            <p className="mt-3 text-gray-500 dark:text-zinc-400 leading-relaxed">{copy.calculatorsDescription}</p>
          </div>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-3">
            {popularCalculators.map((calculator) => (
              <Link
                key={calculator.href}
                href={calculator.href}
                className="group flex items-center justify-between gap-5 rounded-xl border border-black/5 bg-white/60 px-5 py-4 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/70 dark:border-white/5 dark:bg-zinc-900/40 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
              >
                <span>
                  <span className="block font-medium text-foreground">
                    {calculator.name}
                  </span>
                  <span className="mt-1 block text-sm text-gray-500 dark:text-zinc-400">
                    {calculator.detail}
                  </span>
                </span>
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-600"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
          <Link
            href="/calculator"
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-3 font-medium text-primary-700 transition-colors hover:bg-primary-50 active:translate-y-px dark:text-primary-300 dark:hover:bg-primary-950/30"
          >
            {copy.browseCalculators}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Mobile app download section */}
      <div className="flex justify-center mt-16">
        <section
          aria-labelledby="mobile-app-title"
          className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-primary-200/70 bg-gradient-to-br from-primary-50 via-white to-indigo-50 p-6 shadow-sm dark:border-primary-900/60 dark:from-primary-950/35 dark:via-zinc-900/70 dark:to-indigo-950/30 sm:p-10"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-400/15 blur-3xl" aria-hidden="true" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">{copy.mobileTag}</p>
              <h2 id="mobile-app-title" className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{copy.mobileTitle}</h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-zinc-300 sm:text-lg">{copy.mobileDescription}</p>

              <ul className="mt-7 grid gap-3 text-sm text-foreground sm:grid-cols-3">
                <li className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-3 shadow-sm dark:bg-white/5">
                  <ScanLine className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
                  {copy.mobileFeatures[0]}
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-3 shadow-sm dark:bg-white/5">
                  <CircleCheckBig className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {copy.mobileFeatures[1]}
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-3 shadow-sm dark:bg-white/5">
                  <Clapperboard className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  {copy.mobileFeatures[2]}
                </li>
              </ul>

              <MobileAppLinks placement="homepage_mobile_section" labels={{ appleEyebrow: copy.storeAppleEyebrow, googleEyebrow: copy.storeGoogleEyebrow, ariaLabel: copy.storeAriaLabel }} className="mt-8 items-start" />
            </div>

            <div className="mx-auto w-full max-w-[330px] lg:max-w-[360px]">
              <Image
                src="/mobile-app-preview.webp"
                alt={copy.mobilePreviewAlt}
                width={560}
                height={1120}
                sizes="(max-width: 1024px) 330px, 360px"
                className="h-auto w-full rounded-[2rem] border border-black/5 shadow-2xl shadow-primary-950/15 dark:border-white/10"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Block 2: Core Features */}
      <div className="flex justify-center mt-16">
        <div className="w-full max-w-5xl">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">{copy.featuresTitle}</h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <Calculator className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">{copy.featureCards[0].title}</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">{copy.featureCards[0].description}</p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <Camera className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">{copy.featureCards[1].title}</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">{copy.featureCards[1].description}</p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <BookOpen className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">{copy.featureCards[2].title}</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">{copy.featureCards[2].description}</p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 items-center justify-center flex-wrap">
                <LineChart className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">{copy.featureCards[3].title}</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">{copy.featureCards[3].description}</p>
            </div>

          </div>
        </div>
      </div>

      {/* Block 3: How It Works */}
      <div className="flex justify-center mt-16">
        <div className="w-full max-w-5xl">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">{copy.howTitle}</h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="flex flex-col items-center text-center bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-500" strokeWidth={2} />
              </div>
              <h3 className="font-normal text-lg dark:text-gray-200 text-foreground mb-2">{copy.howSteps[0].title}</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">{copy.howSteps[0].description}</p>
            </div>

            <div className="flex flex-col items-center text-center bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6 text-blue-500" strokeWidth={2} />
              </div>
              <h3 className="font-normal text-lg dark:text-gray-200 text-foreground mb-2">{copy.howSteps[1].title}</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">{copy.howSteps[1].description}</p>
            </div>

            <div className="flex flex-col items-center text-center bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-blue-500" strokeWidth={2} />
              </div>
              <h3 className="font-normal text-lg dark:text-gray-200 text-foreground mb-2">{copy.howSteps[2].title}</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">{copy.howSteps[2].description}</p>
            </div>

          </div>
        </div>
      </div>

      {/* Block 4: Subjects Covered */}
      <div className="flex justify-center mt-16">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">{copy.subjectsTitle}</h2>
          <div className="flex text-gray-500 dark:text-zinc-400 flex-col gap-4 mt-5 leading-relaxed">
            <p>{copy.subjectsParagraphs[0]}</p>
            <p>{copy.subjectsParagraphs[1]}</p>
          </div>
        </div>
      </div>

      {/* Block 5: FAQ */}
      <div className="flex justify-center mt-16">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">{copy.faqTitle}</h2>
          <div className="mt-8 flex flex-col gap-12">
            {copy.faqs.map((item) => (
              <div key={item.question} className="flex flex-col gap-3">
                <h3 className="text-xl font-normal text-foreground dark:text-gray-200">{item.question}</h3>
                <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">{item.answer}{item.linkText && <> <a href={detector.href} hrefLang={detector.hrefLang} className="font-medium text-primary-700 underline underline-offset-4 dark:text-primary-300">{item.linkText}</a> {item.afterLink} {copy.detectorLanguageNote}</>}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
