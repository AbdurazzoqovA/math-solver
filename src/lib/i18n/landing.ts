import en from "./landing/en.json";
import es from "./landing/es.json";
import fr from "./landing/fr.json";
import pt from "./landing/pt.json";
import de from "./landing/de.json";
import ru from "./landing/ru.json";
import uk from "./landing/uk.json";
import uz from "./landing/uz.json";
import tr from "./landing/tr.json";
import ar from "./landing/ar.json";
import fa from "./landing/fa.json";
import ur from "./landing/ur.json";
import hi from "./landing/hi.json";
import bn from "./landing/bn.json";
import zh from "./landing/zh.json";
import id from "./landing/id.json";
import type { Locale } from "./locales";

export type LandingCopy = typeof en;
export const landingMessages: Record<Locale, LandingCopy> = { en, es, fr, pt, de, ru, uk, uz, tr, ar, fa, ur, hi, bn, zh, id };
export function getLandingCopy(locale: Locale): LandingCopy { return landingMessages[locale]; }
