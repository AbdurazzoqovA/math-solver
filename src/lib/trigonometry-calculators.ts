import type { CalculatorDefinition } from "./calculators";

const angleInputHint =
  "State whether the angle is in degrees or radians. Use pi for π, such as 5pi/4 radians.";

export const trigonometryCalculators = [
  {
    slug: "trig-identities",
    name: "Trigonometric Identity Calculator",
    category: "Trigonometry",
    seoTitle: "Trigonometric Identity Calculator with Steps",
    description:
      "Verify trigonometric identities or simplify trig expressions with exact rewrite steps, named identities, and clear domain restrictions.",
    keywords: [
      "trigonometric identity calculator",
      "trig identities calculator",
      "verify trigonometric identities",
      "trigonometric simplification calculator",
      "simplify trig expressions",
    ],
    heading: "Trigonometric Identity Calculator",
    heroDescription:
      "Verify an identity or simplify one side while seeing the exact rule behind every rewrite.",
    placeholder:
      "Enter an identity, such as tan(x) cos(x) = sin(x)",
    inputHint:
      "Enter a full identity to verify, or start with “simplify” followed by one trigonometric expression.",
    solverInstruction:
      "Verify or simplify trigonometric expressions symbolically. Treat a proposed identity as equality on the common domain, not as an equation to solve for selected angles. Start with the more complicated side and transform one side at a time, name the exact reciprocal, quotient, Pythagorean, cofunction, even-odd, sum, difference, double-angle, or half-angle identity used, and preserve every domain restriction introduced by denominators or cancellation. Never present numerical samples or matching graphs as a proof. If a proposed equality is not an identity, state that clearly and give an exact counterexample when practical. Do not solve for angle values unless the user explicitly changes the task from identity verification to equation solving.",
    examples: [
      {
        label: "Verify a quotient identity",
        expression: "verify tan(x) cos(x) = sin(x)",
      },
      {
        label: "Simplify with Pythagorean identity",
        expression: "simplify (1 - cos(x)^2) / sin(x)",
      },
      {
        label: "Verify with secant and tangent",
        expression: "verify (sec(x)^2 - 1) / tan(x) = tan(x)",
      },
    ],
    overview: {
      heading: "An identity must work across its common domain",
      paragraphs: [
        "A trigonometric identity is an equality that holds for every angle where both sides are defined. That is different from a trigonometric equation, which may be true only at particular angles. This calculator focuses on proving identities and simplifying expressions, not on finding selected angle solutions.",
        "A clean proof usually starts with the side that has more structure. Algebra, reciprocal and quotient identities, and the Pythagorean identities often reduce it to the other side. Each rewrite should remain equivalent on the original domain, so canceled factors and undefined trig functions still matter.",
      ],
    },
    formula: {
      title: "Core Pythagorean identities",
      latex:
        "\\sin^2\\theta+\\cos^2\\theta=1,\\quad 1+\\tan^2\\theta=\\sec^2\\theta,\\quad 1+\\cot^2\\theta=\\csc^2\\theta",
      explanation:
        "These three identities connect the six trigonometric functions and are often the shortest route through a simplification.",
    },
    methods: [
      {
        title: "Work on the more complicated side",
        description:
          "Rewrite one side until it matches the other. Changing both sides at once can hide a circular argument.",
      },
      {
        title: "Convert strategically",
        description:
          "Use reciprocal, quotient, and Pythagorean identities before converting every function to sine and cosine.",
      },
      {
        title: "Track the common domain",
        description:
          "Record values excluded by tangent, secant, cotangent, cosecant, denominators, or canceled factors.",
      },
    ],
    workedExample: {
      problem: "Simplify (1 - cos²x) / sin x",
      steps: [
        {
          latex:
            "1-\\cos^2x=\\sin^2x",
          note: "Rearrange the Pythagorean identity sin²x + cos²x = 1.",
        },
        {
          latex:
            "\\frac{1-\\cos^2x}{\\sin x}=\\frac{\\sin^2x}{\\sin x}",
          note: "Replace the numerator with an equivalent expression.",
        },
        {
          latex:
            "\\frac{\\sin^2x}{\\sin x}=\\sin x\\quad\\text{for }\\sin x\\ne0",
          note: "Cancel one sine factor while keeping the original denominator restriction.",
        },
        {
          latex:
            "x\\ne k\\pi,\\quad k\\in\\mathbb{Z}",
          note: "The original expression is undefined wherever sin x equals zero.",
        },
      ],
      answer:
        "On the domain of the original expression, the simplified form is sin x. The excluded values are x = kπ for every integer k.",
    },
    mistakes: [
      {
        title: "Testing a few angles as proof",
        description:
          "Numerical checks can catch a false claim, but only equivalent symbolic rewrites prove an identity.",
      },
      {
        title: "Changing both sides together",
        description:
          "A valid proof transforms one side into the other without assuming the equality it is trying to establish.",
      },
      {
        title: "Canceling through addition",
        description:
          "Factors can cancel from a product or quotient. Terms separated by addition or subtraction cannot.",
      },
      {
        title: "Dropping excluded values",
        description:
          "A simpler final expression may be defined at angles where the original expression was not.",
      },
    ],
    faqs: [
      {
        question: "What is the difference between an identity and an equation?",
        answer:
          "An identity is true for every value in the common domain. An equation can be true only for particular values of the variable.",
      },
      {
        question: "Can numerical substitution prove a trig identity?",
        answer:
          "No. It is useful as a check or counterexample search, but a proof requires algebraically equivalent steps.",
      },
      {
        question: "Why does the answer include domain restrictions?",
        answer:
          "Canceling a factor can make the final form look defined at points where the original denominator was zero. Those exclusions remain part of the result.",
      },
      {
        question: "Which side of an identity should I simplify first?",
        answer:
          "Start with the side containing more fractions, functions, or operations. It is usually easier to reduce structure than to build it.",
      },
    ],
    related: [
      "unit-circle",
      "simplify",
      "solve-for-x",
      "law-of-cosines",
    ],
  },
  {
    slug: "unit-circle",
    name: "Unit Circle Calculator",
    category: "Trigonometry",
    seoTitle: "Unit Circle Calculator for Exact Trig Values",
    description:
      "Find unit-circle coordinates, reference angles, and exact sine, cosine, and tangent values from an angle in degrees or radians.",
    keywords: [
      "unit circle calculator",
      "unit circle exact values",
      "unit circle coordinates calculator",
      "reference angle calculator",
      "sine cosine tangent calculator",
    ],
    heading: "Unit Circle Calculator",
    heroDescription:
      "Enter an angle to find its coterminal angle, quadrant, reference angle, coordinates, and exact trig values.",
    placeholder:
      "Enter an angle, such as 150 degrees or 5pi/4 radians",
    inputHint: angleInputHint,
    solverInstruction:
      "Evaluate the supplied angle from the unit circle. Respect an explicit degree or radian unit and do not silently reinterpret one as the other. If a bare numeric angle has no unit, identify the ambiguity instead of guessing. Reduce the angle to a standard coterminal angle, identify the quadrant and reference angle, then return the point (cos theta, sin theta) and explicitly list the exact sine, cosine, and tangent values. Give exact radical or fractional values first for standard angles, with decimals only as secondary approximations. Derive secant, cosecant, and cotangent when requested. Mark a ratio undefined when its denominator is zero and never replace undefined with infinity. Check quadrant signs and preserve exact pi notation.",
    examples: [
      {
        label: "Second-quadrant angle",
        expression: "find the unit-circle values for 150 degrees",
      },
      {
        label: "Radian angle",
        expression: "find the unit-circle point and trig values for 5pi/4 radians",
      },
      {
        label: "Negative angle",
        expression: "find the unit-circle values for -pi/3 radians",
      },
    ],
    overview: {
      heading: "Coordinates carry the unit-circle values",
      paragraphs: [
        "The unit circle has radius 1 and center at the origin. An angle measured from the positive x-axis meets the circle at (cos θ, sin θ), so the horizontal coordinate is cosine and the vertical coordinate is sine.",
        "For a standard angle, a reference angle gives the exact first-quadrant values and the quadrant supplies the signs. Coterminal angles land at the same point, which means negative angles and angles beyond one full turn use the same process.",
      ],
    },
    formula: {
      title: "The coordinate definition",
      latex:
        "P(\\theta)=(\\cos\\theta,\\sin\\theta),\\quad \\cos^2\\theta+\\sin^2\\theta=1",
      explanation:
        "Every point on the unit circle has coordinates (x, y) with x = cos θ and y = sin θ.",
    },
    methods: [
      {
        title: "Reduce to one turn",
        description:
          "Add or subtract full turns until the angle lies between 0 and 360 degrees, or between 0 and 2π radians.",
      },
      {
        title: "Find the reference angle",
        description:
          "Measure the acute angle between the terminal side and the x-axis, then use the familiar first-quadrant values.",
      },
      {
        title: "Apply quadrant signs",
        description:
          "Cosine follows the x-coordinate sign, sine follows the y-coordinate sign, and tangent is their ratio.",
      },
    ],
    workedExample: {
      problem: "Find the exact unit-circle values for 150°",
      steps: [
        {
          latex:
            "150^\\circ\\text{ lies in quadrant II}",
          note: "Its terminal side is above the x-axis and left of the y-axis.",
        },
        {
          latex:
            "180^\\circ-150^\\circ=30^\\circ",
          note: "The reference angle is 30 degrees.",
        },
        {
          latex:
            "(\\cos30^\\circ,\\sin30^\\circ)=\\left(\\frac{\\sqrt3}{2},\\frac12\\right)",
          note: "Use the exact first-quadrant coordinates for 30 degrees.",
        },
        {
          latex:
            "(\\cos150^\\circ,\\sin150^\\circ)=\\left(-\\frac{\\sqrt3}{2},\\frac12\\right)",
          note: "Cosine is negative and sine is positive in quadrant II.",
        },
        {
          latex:
            "\\tan150^\\circ=\\frac{\\sin150^\\circ}{\\cos150^\\circ}=-\\frac{\\sqrt3}{3}",
          note: "Divide the y-coordinate by the x-coordinate and rationalize.",
        },
      ],
      answer:
        "The unit-circle point is (-√3/2, 1/2). Thus sin 150° = 1/2, cos 150° = -√3/2, and tan 150° = -√3/3.",
    },
    mistakes: [
      {
        title: "Swapping sine and cosine",
        description:
          "A unit-circle point is ordered as (cos θ, sin θ), so cosine is the x-coordinate.",
      },
      {
        title: "Mixing degrees and radians",
        description:
          "A value such as 30 means something entirely different from π/6 unless its unit is stated.",
      },
      {
        title: "Forgetting quadrant signs",
        description:
          "The reference angle gives magnitudes. The actual quadrant determines whether each value is positive or negative.",
      },
      {
        title: "Calling an undefined ratio infinity",
        description:
          "Tangent and secant are undefined when cosine is zero. Cotangent and cosecant are undefined when sine is zero.",
      },
    ],
    faqs: [
      {
        question: "Why is the unit-circle point written as (cos θ, sin θ)?",
        answer:
          "On a circle of radius 1, the horizontal coordinate equals cosine and the vertical coordinate equals sine.",
      },
      {
        question: "Can I enter a negative angle or an angle above 360 degrees?",
        answer:
          "Yes. Add or subtract full turns to find a coterminal angle at the same point on the circle.",
      },
      {
        question: "When does the calculator return an exact value?",
        answer:
          "Standard angles such as multiples of 30 or 45 degrees have exact fractional or radical values. Other angles usually need decimal approximations.",
      },
      {
        question: "Why is tangent undefined at 90 degrees?",
        answer:
          "Tangent is sin θ divided by cos θ. At 90 degrees, cosine is zero, so the ratio requires division by zero.",
      },
    ],
    related: [
      "trig-identities",
      "law-of-cosines",
      "distance-formula",
      "simplify",
    ],
  },
  {
    slug: "law-of-cosines",
    name: "Law of Cosines Calculator",
    category: "Trigonometry",
    seoTitle: "Law of Cosines Calculator with Steps",
    description:
      "Solve SAS and SSS triangles with the Law of Cosines. Find a missing side or angle with validity checks, exact setup, and clear steps.",
    keywords: [
      "law of cosines calculator",
      "cosine rule calculator",
      "law of cosines calculator with steps",
      "SAS triangle calculator",
      "SSS triangle calculator",
    ],
    heading: "Law of Cosines Calculator",
    heroDescription:
      "Use two sides and their included angle, or all three sides, to find a missing triangle measurement.",
    placeholder:
      "Enter triangle data, such as a = 7, b = 10, C = 60 degrees; find c",
    inputHint:
      "Use matching labels: side a is opposite angle A, side b is opposite B, and side c is opposite C.",
    solverInstruction:
      "Apply the Law of Cosines only to valid SAS data with two sides and their included angle, or valid SSS data with three sides. Bind each lowercase side to its opposite uppercase angle, state which quantity is unknown, and select the matching cyclic form before substituting. Require positive side lengths, require supplied interior angles to lie strictly between 0 and 180 degrees, and check the triangle inequality for SSS data. Respect stated degree or radian units. Keep full precision through the calculation, give an exact radical when useful, and round only the final approximation. For an angle, isolate cosine and use the correct inverse-cosine branch. If the data are SSA, ASA, or AAS, explain that the Law of Cosines is not the direct first method rather than forcing the formula. Check that the largest side faces the largest angle and that a completed triangle's angles sum to 180 degrees.",
    examples: [
      {
        label: "SAS: find a side",
        expression: "a = 7, b = 10, C = 60 degrees; find c",
      },
      {
        label: "SSS: find an angle",
        expression: "a = 7, b = 8, c = 9; find angle C",
      },
      {
        label: "Obtuse included angle",
        expression: "a = 5, b = 8, C = 110 degrees; find c",
      },
    ],
    overview: {
      heading: "Use the Law of Cosines for SAS or SSS",
      paragraphs: [
        "The Law of Cosines connects all three sides of a triangle with one angle. It is the direct choice when you know two sides and the angle between them, called SAS, or when you know all three sides, called SSS.",
        "Labels must stay paired: side c sits opposite angle C. With SAS, solve a side form and take the positive square root. With SSS, rearrange the same formula and use inverse cosine. Triangle checks should happen before rounding any result.",
      ],
    },
    formula: {
      title: "Law of Cosines",
      latex:
        "c^2=a^2+b^2-2ab\\cos C",
      explanation:
        "This form links side c to its opposite angle C and the two adjacent sides a and b. The other forms follow by cycling the labels.",
    },
    methods: [
      {
        title: "Identify SAS or SSS",
        description:
          "For SAS, the known angle must sit between the two known sides. For SSS, all three side lengths must form a valid triangle.",
      },
      {
        title: "Match opposite labels",
        description:
          "Choose the formula whose left side is the side opposite the angle used in the cosine term.",
      },
      {
        title: "Calculate, then check",
        description:
          "Keep full precision until the final value, then confirm the side-angle ordering and any required triangle sum.",
      },
    ],
    workedExample: {
      problem: "Given a = 7, b = 10, and C = 60°, find c",
      steps: [
        {
          latex:
            "c^2=a^2+b^2-2ab\\cos C",
          note: "The known angle C is included between sides a and b, so this is SAS.",
        },
        {
          latex:
            "c^2=7^2+10^2-2(7)(10)\\cos60^\\circ",
          note: "Substitute the two sides and their included angle.",
        },
        {
          latex:
            "c^2=49+100-140\\left(\\frac12\\right)=79",
          note: "Use the exact value cos 60° = 1/2.",
        },
        {
          latex:
            "c=\\sqrt{79}\\approx8.888",
          note: "A side length is positive, so take the positive square root and round at the end.",
        },
      ],
      answer:
        "The missing side is c = √79, which is approximately 8.888 units.",
    },
    mistakes: [
      {
        title: "Using a non-included angle for SAS",
        description:
          "The angle in the side formula must be the angle between the two known sides.",
      },
      {
        title: "Pairing the wrong side and angle",
        description:
          "In c² = a² + b² - 2ab cos C, side c must be opposite angle C.",
      },
      {
        title: "Rounding during the setup",
        description:
          "Keep the cosine and squared value at full precision so early rounding does not shift the final side or angle.",
      },
      {
        title: "Skipping triangle validity checks",
        description:
          "Three positive lengths still fail to form a triangle if any two do not add to more than the third.",
      },
    ],
    faqs: [
      {
        question: "When should I use the Law of Cosines?",
        answer:
          "Use it directly for SAS, where two sides and their included angle are known, or SSS, where all three sides are known.",
      },
      {
        question: "How do I use the Law of Cosines to find an angle?",
        answer:
          "Rearrange to cos C = (a² + b² - c²)/(2ab), then apply inverse cosine in the stated angle unit.",
      },
      {
        question: "How is the Law of Cosines related to the Pythagorean theorem?",
        answer:
          "When C is 90 degrees, cos C is zero, so the formula becomes c² = a² + b².",
      },
      {
        question: "Can the Law of Cosines solve an SSA triangle?",
        answer:
          "Not as the direct first method. SSA gives two sides and a non-included angle, so the Law of Sines and its ambiguous-case check are usually needed first.",
      },
    ],
    related: [
      "unit-circle",
      "trig-identities",
      "distance-formula",
      "solve-for-x",
    ],
  },
] satisfies CalculatorDefinition[];
