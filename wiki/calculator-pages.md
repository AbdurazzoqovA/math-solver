# Calculator Pages

Production notes for the calculator SEO system launched on 2026-07-24. Related pages: [[growth-strategy]], [[codebase-map]], [[tech-and-ops]], [[product-overview]], [[index]].

## Shipped routes

Hub: `/calculator`

| Route | Primary search intent | Important secondary intent | Intent boundary |
|---|---|---|---|
| `/calculator/solve-for-x` | solve for x calculator | equation solver for x, isolate x | Broad one-variable equation solving |
| `/calculator/quadratic-equation` | quadratic equation calculator | quadratic formula, discriminant, roots | Roots and discriminant, not factor form |
| `/calculator/simplify` | simplify calculator | simplify algebraic expressions, combine like terms | Equivalent cleaner form, not equation solving |
| `/calculator/factoring` | factoring calculator | factor polynomials, trinomials, GCF | Product form, not integer prime factorization |
| `/calculator/systems-of-equations` | systems of equations calculator | simultaneous equations, elimination, substitution | Shared solution of two or more equations |
| `/calculator/inequalities` | inequality calculator | interval notation, compound inequalities | Solution ranges and endpoint rules |
| `/calculator/exponents` | exponent calculator | powers, negative and fractional exponents | Evaluate and simplify powers |
| `/calculator/logarithms` | logarithm calculator | log base, natural log, change of base | Evaluate, rewrite, and solve logs |
| `/calculator/polynomial` | polynomial calculator | polynomial operations, roots, division | Multi-operation hub; keep factoring pages focused |
| `/calculator/rational-expressions` | rational expression calculator | algebraic fractions, excluded values | Fractions plus original domain restrictions |
| `/calculator/complete-the-square` | complete the square calculator | vertex form, solve by completing square | This specific quadratic method |
| `/calculator/slope` | slope calculator | slope from two points, rise over run | Line rate of change, not point distance |
| `/calculator/distance-formula` | distance formula calculator | distance between two points, coordinate distance | Coordinate-plane distance, not maps or speed |
| `/calculator/derivative` | derivative calculator | differentiation with steps, higher derivatives | Explicit single-variable functions, not partial or implicit differentiation |
| `/calculator/integral` | integral calculator | antiderivative, indefinite integral, substitution | General antiderivatives and + C, not bounds or signed area |
| `/calculator/definite-integral` | definite integral calculator | integral with bounds, Fundamental Theorem | Exact value and signed accumulation over bounds |
| `/calculator/limit` | limit calculator | one-sided limit, limit at infinity, DNE | Function approach behavior, not derivative from the limit definition |
| `/calculator/partial-derivative` | partial derivative calculator | multivariable and mixed partial derivatives | One selected variable while other independent variables stay fixed |
| `/calculator/implicit-differentiation` | implicit differentiation calculator | implicit derivative, find dy/dx | Relations where y is not isolated |
| `/calculator/taylor-series` | Taylor series calculator | Maclaurin series, Taylor polynomial | Construct an expansion from a center and degree |
| `/calculator/series-convergence` | series convergence calculator | convergence tests, absolute or conditional convergence | Prove convergence or divergence, not finite summation |
| `/calculator/matrix` | matrix calculator | matrix operations, multiplication, transpose, RREF | General operations; specialized scalar, inverse, and spectral work stay separate |
| `/calculator/determinant` | determinant calculator | matrix determinant, 3x3 determinant, cofactor expansion | One scalar from a square matrix, not a matrix inverse |
| `/calculator/matrix-inverse` | inverse matrix calculator | matrix inverse, Gauss-Jordan inverse | Ordinary two-sided inverse and singularity checks |
| `/calculator/eigenvalue` | eigenvalue calculator | eigenvalues and eigenvectors, characteristic polynomial | Spectral data for a square matrix; singular route chosen from live search wording |
| `/calculator/dot-product` | dot product calculator | angle between vectors, orthogonality, projection | Scalar product and its geometric uses |
| `/calculator/cross-product` | cross product calculator | 3D vector cross product, normal vector, area | Ordered 3D perpendicular vector, not a scalar product |
| `/calculator/trig-identities` | trigonometric identity calculator | verify trig identities, simplify trig expressions | Symbolic verification or simplification, not equation solving or numerical sampling as proof |
| `/calculator/unit-circle` | unit circle calculator | reference angle, coterminal angle, exact trig values | Coordinates and exact trig values for one stated angle and unit |
| `/calculator/law-of-cosines` | law of cosines calculator | SAS triangle, SSS triangle, missing side or angle | Valid SAS or SSS cases, not SSA/ASA/AAS |
| `/calculator/standard-deviation` | standard deviation calculator | sample standard deviation, population standard deviation | Spread of a data set with sample/population choice stated |
| `/calculator/mean-median-mode` | mean median mode calculator | average calculator, measures of center | Central tendency, not spread or probability |
| `/calculator/probability` | probability calculator | conditional probability, independent events | Stated event probabilities without silently assuming independence |
| `/calculator/permutation-combination` | permutation and combination calculator | nPr, nCr, counting calculator | Ordered versus unordered selections with repetition rules stated |
| `/calculator/z-score` | z-score calculator | standard score, value from z-score | Standardization only; percentile claims require a stated normal model |
| `/calculator/fraction` | fraction calculator | add, subtract, multiply, divide fractions | Numerical fraction arithmetic, not algebraic rational expressions |
| `/calculator/percentage` | percentage calculator | percent change, reverse percentage, percent of a number | Numeric percentage relationships with the requested base identified |
| `/calculator/gcd-lcm` | GCF and LCM calculator | greatest common divisor, HCF, least common multiple | Integer factor relationships, not polynomial factoring |
| `/calculator/word-problems` | math word problem solver | algebra word problems with steps | Translate stated quantities and units; flag missing information |
| `/calculator/inverse-function` | inverse function calculator | find inverse, verify inverse by composition | One-to-one inverse with domain/range restrictions, not the reciprocal |
| `/calculator/function-composition` | function composition calculator | composite functions, evaluate f of g | Ordered substitution and domain restrictions, not multiplication |
| `/calculator/domain-range` | domain and range calculator | function domain, function range, interval notation | Formula-based analysis; no claim to interpret an unlabeled graph reliably |
| `/calculator/graphing` | graphing calculator | plot functions online, function graph | Up to four explicit real-valued functions of x, not implicit or polar curves |

No trustworthy public exact-volume source was available during launch research. Priority is directional, based on exact-match calculator SERP density, established competitor coverage, and clarity of transactional intent. Do not publish volume claims without Search Console, Keyword Planner, or a paid keyword dataset.

Calculus intent was rechecked against live SERPs on 2026-07-24. Exact topic pages and the repeated `with steps` modifier appear across [Symbolab](https://www.symbolab.com/solver/derivative-calculator), [WolframAlpha](https://www.wolframalpha.com/calculators/derivative-calculator/), [Mathway](https://www.mathway.com/Calculator/definite-integral-calculator), and [Pearson](https://www.pearson.com/channels/calculators/taylor-series-calculator). Mathematical coverage and caveats were cross-checked against the [OpenStax Calculus](https://openstax.org/details/books/calculus-volume-1/) sequence. These sources support intent and terminology, not public volume claims.

Linear Algebra intent was rechecked against live SERPs on 2026-07-24. Exact calculator intent and the `with steps` modifier are represented by [MatrixCalc](https://matrixcalc.net/), [Pearson matrix tools](https://www.pearson.com/channels/calculators/matrix-calculator), and focused [WolframAlpha inverse](https://www.wolframalpha.com/calculators/matrix-inverse-calculator) and [eigenvalue](https://www.wolframalpha.com/calculators/eigenvalue-calculator) pages. Terminology and mathematical boundaries were cross-checked against the [MIT OpenCourseWare Linear Algebra resource index](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/resource-index/). These sources support intent and terminology, not public volume claims.

Trigonometry intent was rechecked against current exact-topic pages from [Pearson](https://www.pearson.com/channels/calculators/trigonometric-identity-calculator), [Symbolab](https://www.symbolab.com/solver/trigonometric-identity-calculator), and [Omni Calculator](https://www.omnicalculator.com/math/law-of-cosines). Definitions and scope were checked against OpenStax chapters on [trigonometric identities](https://openstax.org/books/precalculus-2e/pages/7-1-simplifying-and-verifying-trigonometric-identities), the [unit circle](https://openstax.org/books/algebra-and-trigonometry-2e/pages/7-3-unit-circle), and the [Law of Cosines](https://openstax.org/books/algebra-and-trigonometry/pages/10-2-non-right-triangles-law-of-cosines).

Statistics scope was checked against NIST material on [measures of location](https://www.itl.nist.gov/div898/handbook/eda/section3/eda351.htm) and [z-scores](https://itl.nist.gov/div898/handbook/eda/section3/eda35h.htm), plus Penn State references for [standard deviation](https://online.stat.psu.edu/stat200/lesson/2/2.2/2.2.5), [probability formulas](https://online.stat.psu.edu/stat200/formulas), and [counting techniques](https://online.stat.psu.edu/stat414/Lesson03). The resulting pages explicitly distinguish sample from population, ordering from non-ordering, and independence from mutually exclusive events.

General Math and Precalculus naming was checked against live focused pages including [Pearson's percentage calculator](https://www.pearson.com/channels/calculators/percentage-calculator), [Pearson's GCF and LCM calculator](https://www.pearson.com/channels/calculators/gcf-lcm-calculator), and [MathCalcLab's function composition calculator](https://mathcalclab.com/algebra/function-composition). Mathematical edge cases were verified against the relevant OpenStax Prealgebra and Precalculus chapters. The singular `/inverse-function` route matches current search-page wording.

Graphing behavior and user expectations were compared with the current [Desmos Graphing Calculator guide](https://help.desmos.com/hc/en-us/articles/4406040715149-Getting-Started-Desmos-Graphing-Calculator) and [GeoGebra Graphing Calculator](https://www.geogebra.org/graphing?lang=en). MathSolver intentionally ships a smaller explicit-function tool with transparent limits rather than suggesting parity with a full computer algebra graphing system.

## Architecture

- `src/lib/calculators.ts` defines shared types and categories, holds the Algebra/precalculus definitions, combines every category, and validates the complete registry.
- `src/lib/calculus-calculators.ts` holds the eight Calculus definitions, including page-specific `solverInstruction` values.
- `src/lib/linear-algebra-calculators.ts` holds the six Linear Algebra definitions, reusable matrix/vector input hints, and operation-specific `solverInstruction` values.
- `src/lib/trigonometry-calculators.ts`, `src/lib/statistics-calculators.ts`, and `src/lib/general-precalculus-calculators.ts` keep the next 15 definitions grouped by subject.
- `src/lib/graphing-calculator.ts` defines the graphing page and selects a reusable graphing tool rather than the standard first-message solver.
- `src/lib/math-expression.ts` is a no-`eval` recursive-descent parser for the graphing tool. It supports x, constants, common functions, implicit multiplication, and ordinary arithmetic operators.
- `src/app/calculator/[slug]/page.tsx` statically generates all supported routes. `dynamicParams = false` prevents unknown slugs from becoming generic 200 pages.
- `src/components/calculators/CalculatorPage.tsx` renders the unique server-side article content.
- `src/components/calculators/CalculatorExperience.tsx` owns the tool-to-chat transition. Before submission it shows the topic header, reusable input, examples, and server-rendered article. After submission it replaces that whole surface with the shared `ChatConversation` from `ChatArea.tsx`.
- `src/components/calculators/CalculatorSolver.tsx` renders the reusable first-message input, optional notation hint, and topic examples. OCR, drawing, and math entry come from the same `HeroInput` used on the homepage.
- `src/components/calculators/GraphingCalculator.tsx` renders up to four explicit functions on a responsive canvas with visibility controls, editable ranges, pan, zoom, reset, tracing, and an accessible value table.
- The first calculator submission calls `ChatContext.sendMessage(..., { forceNewChat: true, source: "calculator:<slug>" })`. The source tag associates the new chat with its calculator route and prevents a previously active conversation from appearing in or receiving the problem.
- `ChatContext` sends that source with solve requests. `/api/solve` trusts only slugs found in the server registry, then appends the matching server-owned calculator instruction. Client text cannot supply an arbitrary system instruction.
- Calculator answers use the exact main-solver conversation shell: streamed `MessageList`, automatic transcript scrolling, the bottom-pinned `ChatInput`, follow-up questions, and practice tests.
- `src/app/calculator/[slug]/opengraph-image.tsx` generates a topic-specific 1200x630 PNG from the same registry. The hub has its own generated OG card.
- The hub, homepage calculator section, sidebar, breadcrumbs, and curated related links make every route reachable through normal anchors.

## SEO contract

Every calculator page has:

- A unique title, meta description, H1, canonical, Open Graph URL, Twitter card, and topic-specific OG image.
- A focused keyword list in metadata. Registry validation rejects duplicate keywords on the same page and incomplete keyword sets.
- Server-rendered breadcrumb, calculator copy, formula, method notes, worked example, mistakes, related links, and visible FAQs.
- `WebPage`, `BreadcrumbList`, and `WebApplication` JSON-LD with no invented reviews or ratings.
- A functional topic-configured solver above the main article, with unique placeholder text and example problems.
- A calm accuracy note. Do not claim answers are verified or 100 percent accurate until a real verification pass exists.
- No em dash characters in calculator content.

Google retired FAQ rich results in May 2026 and removed the documentation in June 2026, so visible FAQs remain useful but `FAQPage` JSON-LD is intentionally absent. `PracticeProblem` search markup was also retired in January 2026. See [Google Search updates](https://developers.google.com/search/updates).

Sitemap `lastModified` dates must reflect real significant changes. Do not restore `new Date()` on every sitemap request. Google ignores sitemap priority and change frequency hints.

## Cannibalization rules

- `/` owns `math solver`, `AI math solver`, and broad step-by-step solver terms.
- Solve for x owns general single-variable isolation. Quadratic owns roots and discriminant. Factoring owns product form. Completing the square owns that method and vertex conversion.
- Simplify owns equivalent-expression cleanup. Rational expressions owns algebraic fractions and excluded values.
- Systems owns two or more equations. Do not target `solve for x and y` on solve for x.
- Slope owns rise over run and line direction. Distance formula owns Euclidean length.
- Derivative owns explicit single-variable differentiation. Partial derivative owns multivariable functions with a chosen variable. Implicit differentiation owns equations where y is not isolated.
- Integral owns indefinite antiderivatives and + C. Definite integral owns bounds, exact values, signed accumulation, and Fundamental Theorem evaluation.
- Limit owns nearby function behavior, including one-sided and infinite limits. It does not own derivative-from-first-principles intent.
- Taylor series owns expansions from a function, center, and degree. Series convergence owns the convergence verdict and proof test for an infinite numerical series.
- Matrix owns general addition, subtraction, multiplication, transpose, and row reduction. Determinant owns the scalar determinant. Matrix inverse owns the ordinary inverse and singularity test.
- Eigenvalue owns characteristic polynomials, eigenvalues, and eigenvectors. Use the singular `/eigenvalue` route as the canonical page; do not add `/eigenvalues` as an unplanned alias.
- Dot product owns scalar products, vector angles, orthogonality, and projections. Cross product owns the ordered 3D perpendicular vector and area interpretation.
- Trigonometric identities owns symbolic identity verification and simplification. Unit circle owns one angle's coterminal/reference-angle and exact-coordinate values. Law of Cosines owns valid SAS and SSS triangle cases.
- Standard deviation owns data spread. Mean/median/mode owns center. Z-score owns standardization. Probability owns event relationships. Permutation/combination owns finite counting with explicit order and repetition choices.
- Fraction owns numerical fraction arithmetic. Rational expressions owns variable-containing algebraic fractions. Percentage owns direct numeric percent relationships. Word problems owns translating a stated situation into equations with units.
- GCF/LCM owns integer factors and multiples. Factoring owns algebraic polynomial product form.
- Inverse function owns one-to-one reversal and both composition checks. Function composition owns ordered substitution. Domain/range owns valid inputs and attainable outputs.
- Graphing owns interactive plots of explicit functions of x. It does not claim implicit, polar, parametric, 3D, or symbolic-equation graphing.
- Do not add alias routes such as `/quadratic-formula` without a canonical and migration decision.

## Launch verification

- TypeScript and production build pass.
- All 43 routes are statically generated. The 16 newest routes return 200, include canonical and keyword metadata, and emit the expected structured-data blocks.
- All 16 new detail OG endpoints return valid 1200×630 PNG images. Long examples use responsive OG typography rather than clipping.
- Registry checks cover duplicate slugs/titles/descriptions, slug format, category population, related-link validity, self-links, content completeness, keyword completeness and uniqueness, metadata lengths, compact first OG examples, required topic instructions, graph-tool configuration, and banned dash characters.
- Desktop and 390 × 844 mobile layouts were inspected, including the graphing interface and the longest new calculator title.
- Live solves passed for determinant, derivative, unit-circle values, population standard deviation, inverse-function verification, and a ticket-price word problem. Currency dollar signs now remain prose instead of being misread as LaTeX delimiters.
- The graphing tool was checked with multiple visible curves, mobile stacking, pan/zoom/range controls, and a correct tutor explanation of `x^2 - 4`.
- Local browser testing shows the existing Cloudflare Turnstile localhost warning only. No calculator-specific browser errors were found.
- The user confirmed that the full 43-calculator release was deployed on 2026-07-24.

## Next work

- Submit the deployed `/sitemap.xml` in Search Console and inspect the hub plus representative Algebra, Calculus, matrix, vector, statistics, and graphing pages.
- Track impressions and clicks by `/calculator/` route, plus solve starts and example-chip clicks.
- The current 43-page calculator taxonomy is shipped. Do not add near-duplicate aliases until Search Console reveals a distinct query cluster.
- Move next to the alternative/comparison cluster and retention work in [[growth-strategy]], while monitoring calculator impressions before choosing any second-wave calculator topics.
