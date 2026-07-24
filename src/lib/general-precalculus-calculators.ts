import type { CalculatorDefinition } from "./calculators";

const fractionInputHint =
  "Use / for a fraction and include the operation, such as 7/12 + 5/18. Write a mixed number as 2 1/3.";

const percentageInputHint =
  "State which value is the part, whole, original, or new amount. You can include % and currency symbols.";

const integerListInputHint =
  "Enter two or more whole numbers separated by commas, such as 84, 126.";

const functionInputHint =
  "Name each function and the requested operation, such as f(x) = 2x + 3.";

export const generalPrecalculusCalculators = [
  {
    slug: "fraction",
    name: "Fraction Calculator",
    category: "General Math",
    seoTitle: "Fraction Calculator with Steps",
    description:
      "Add, subtract, multiply, divide, and simplify fractions or mixed numbers. See common denominators, reciprocal steps, and reduced exact answers.",
    keywords: [
      "fraction calculator",
      "fraction calculator with steps",
      "add and subtract fractions calculator",
      "mixed number calculator",
    ],
    heading: "Fraction Calculator",
    heroDescription:
      "Calculate with fractions and mixed numbers while keeping every common-denominator and simplification step visible.",
    placeholder: "Enter a fraction problem, such as 7/12 + 5/18",
    inputHint: fractionInputHint,
    solverInstruction:
      "Solve the requested arithmetic operation on numerical fractions or mixed numbers. Reject a zero denominator, convert mixed numbers to improper fractions when useful, use a common denominator for addition or subtraction, multiply by the reciprocal for division, preserve an exact fraction, reduce the final result with the greatest common divisor, and include a mixed-number form only when it helps. Keep this page focused on numerical fractions rather than algebraic rational expressions.",
    examples: [
      { label: "Unlike denominators", expression: "7/12 + 5/18" },
      { label: "Mixed numbers", expression: "2 1/3 - 5/6" },
      { label: "Fraction division", expression: "3/5 ÷ 9/10" },
    ],
    overview: {
      heading: "Fractions keep a value exact",
      paragraphs: [
        "A fraction records a numerator divided by a nonzero denominator. Unlike a rounded decimal, it can preserve an exact value through several operations.",
        "Addition and subtraction need equivalent fractions with a common denominator. Multiplication works across numerators and denominators, while division uses the reciprocal of the second fraction. The final result should be reduced so its numerator and denominator share no factor greater than one.",
      ],
    },
    formula: {
      title: "Adding fractions with different denominators",
      latex:
        "\\frac{a}{b}+\\frac{c}{d}=\\frac{ad+bc}{bd},\\qquad b\\ne0,\\ d\\ne0",
      explanation:
        "Cross-multiplication creates a common denominator. The resulting fraction may still need to be reduced.",
    },
    methods: [
      {
        title: "Use the least common denominator",
        description:
          "For addition or subtraction, rewrite both fractions with the least common multiple of their denominators.",
      },
      {
        title: "Multiply or divide directly",
        description:
          "Multiply numerator by numerator and denominator by denominator. For division, first replace the second fraction with its reciprocal.",
      },
      {
        title: "Reduce at the end",
        description:
          "Divide the numerator and denominator by their greatest common divisor, and keep the sign in the numerator.",
      },
    ],
    workedExample: {
      problem: "Add 7/12 and 5/18",
      steps: [
        {
          latex: "\\operatorname{lcm}(12,18)=36",
          note: "Use 36 as the least common denominator.",
        },
        {
          latex:
            "\\frac{7}{12}=\\frac{21}{36},\\qquad \\frac{5}{18}=\\frac{10}{36}",
          note: "Multiply each numerator and denominator by its missing factor.",
        },
        {
          latex: "\\frac{21}{36}+\\frac{10}{36}=\\frac{31}{36}",
          note: "Add the numerators once the denominators match.",
        },
        {
          latex: "\\gcd(31,36)=1",
          note: "The numerator and denominator have no common factor, so the result is reduced.",
        },
      ],
      answer: "The exact sum is 31/36.",
    },
    mistakes: [
      {
        title: "Adding denominators",
        description:
          "The denominator names the size of each part. It must be made common, not added to the other denominator.",
      },
      {
        title: "Flipping the wrong fraction",
        description:
          "When dividing, take the reciprocal of the divisor, which is the second fraction.",
      },
      {
        title: "Leaving a reducible result",
        description:
          "A correct calculation can still be incomplete if numerator and denominator share a common factor.",
      },
    ],
    faqs: [
      {
        question: "Can the calculator use mixed numbers?",
        answer:
          "Yes. Enter a mixed number with a space, such as 2 1/3. It will be converted to an improper fraction before the operation.",
      },
      {
        question: "Why can a denominator not be zero?",
        answer:
          "Division by zero is undefined, so a fraction with denominator zero does not represent a number.",
      },
      {
        question: "Does the answer include a decimal?",
        answer:
          "The exact reduced fraction is the main answer. A decimal approximation can also be given when it is useful.",
      },
      {
        question: "Can this simplify fractions with variables?",
        answer:
          "Use the rational expression calculator for algebraic fractions. This page is focused on numerical fractions and mixed numbers.",
      },
    ],
    related: ["gcd-lcm", "percentage", "rational-expressions", "simplify"],
  },
  {
    slug: "percentage",
    name: "Percentage Calculator",
    category: "General Math",
    seoTitle: "Percentage Calculator with Steps",
    description:
      "Find a percent of a number, percent change, increase, decrease, or an original value. See the correct base value and every calculation step.",
    keywords: [
      "percentage calculator",
      "percent of a number calculator",
      "percentage change calculator",
      "reverse percentage calculator",
    ],
    heading: "Percentage Calculator",
    heroDescription:
      "Solve percent-of, percent-change, increase, decrease, and reverse-percentage questions with the base value clearly identified.",
    placeholder: "Enter a percent question, such as what is 18% of 250?",
    inputHint: percentageInputHint,
    solverInstruction:
      "Solve the percentage question the user actually states. Identify the part, whole, original value, new value, and rate before selecting a formula. Convert the percent to a decimal when calculating, use the original value as the denominator for percent change, state that relative percent change from zero is undefined, preserve currency units, and distinguish a percentage-point change from a percent change. Do not assume an unstated base value.",
    examples: [
      { label: "Percent of a number", expression: "What is 18% of 250?" },
      { label: "Percent change", expression: "Percent change from 80 to 100" },
      {
        label: "Reverse percentage",
        expression: "After a 20% discount the price is $72. Find the original.",
      },
    ],
    overview: {
      heading: "The base value decides the percentage",
      paragraphs: [
        "A percentage is a ratio measured per hundred. The same three quantities appear in most basic questions: the part, the whole, and the percent rate.",
        "Change questions require extra care because the original amount is the comparison base. A rise from 80 to 100 is measured against 80, while a drop from 100 to 80 is measured against 100. Reverse percentages undo the multiplier that produced the final amount.",
      ],
    },
    formula: {
      title: "Core percentage relationship",
      latex:
        "\\text{part}=\\frac{p}{100}\\cdot\\text{whole},\\qquad p=100\\cdot\\frac{\\text{part}}{\\text{whole}}",
      explanation:
        "Use the known part, whole, and rate to solve for the missing quantity.",
    },
    methods: [
      {
        title: "Name the quantities",
        description:
          "Decide which number is the part, which is the whole or original amount, and which rate is given.",
      },
      {
        title: "Convert the rate",
        description:
          "Divide a percentage by 100 before multiplying, or multiply a decimal ratio by 100 to report a percent.",
      },
      {
        title: "Use the correct change multiplier",
        description:
          "Multiply by 1 + p/100 for an increase and 1 - p/100 for a decrease. Divide by that multiplier to recover the original.",
      },
    ],
    workedExample: {
      problem: "What percent of 240 is 54?",
      steps: [
        {
          latex: "\\text{part}=54,\\qquad \\text{whole}=240",
          note: "Identify the compared amount and the full base amount.",
        },
        {
          latex: "p=100\\cdot\\frac{54}{240}",
          note: "Divide the part by the whole and convert the ratio to a percent.",
        },
        {
          latex: "\\frac{54}{240}=0.225",
          note: "The decimal ratio is exact.",
        },
        {
          latex: "p=22.5\\%",
          note: "Multiply the decimal by 100 and attach the percent sign.",
        },
      ],
      answer: "54 is 22.5 percent of 240.",
    },
    mistakes: [
      {
        title: "Dividing by the new value",
        description:
          "Percent change normally uses the original value in the denominator, not the final value.",
      },
      {
        title: "Using 18 instead of 0.18",
        description:
          "A percent must be divided by 100 before it is used as a multiplication rate.",
      },
      {
        title: "Reversing a discount by adding it back",
        description:
          "To undo a 20 percent discount, divide the final value by 0.80. Adding 20 percent to the discounted value uses a different base.",
      },
    ],
    faqs: [
      {
        question: "How do I find what percent one number is of another?",
        answer:
          "Divide the part by the whole, then multiply the ratio by 100 percent.",
      },
      {
        question: "Can it calculate percentage increase and decrease?",
        answer:
          "Yes. Provide the original and new values so the change can be divided by the original amount.",
      },
      {
        question: "What is a reverse percentage?",
        answer:
          "It recovers the original amount from a final amount and a known increase or decrease rate by undoing the change multiplier.",
      },
      {
        question: "Is percent change from zero defined?",
        answer:
          "No. Relative percent change divides by the original value, so an original value of zero makes that calculation undefined.",
      },
    ],
    related: ["fraction", "word-problems", "solve-for-x", "exponents"],
  },
  {
    slug: "gcd-lcm",
    name: "GCF and LCM Calculator",
    category: "General Math",
    seoTitle: "GCF and LCM Calculator with Steps",
    description:
      "Find the GCF, GCD, HCF, and LCM of two or more integers. Compare prime factorization and Euclidean steps, including zero and sign cases.",
    keywords: [
      "gcf and lcm calculator",
      "gcd lcm calculator",
      "greatest common divisor calculator",
      "least common multiple calculator",
    ],
    heading: "GCF and LCM Calculator",
    heroDescription:
      "Find common factors and multiples through prime factorization or the Euclidean algorithm, with sign and zero cases handled.",
    placeholder: "Enter integers, such as 84, 126",
    inputHint: integerListInputHint,
    solverInstruction:
      "Find the requested greatest common divisor, greatest common factor, highest common factor, or least common multiple for the supplied integers. Treat GCD, GCF, and HCF as equivalent names, use absolute values for signs, show prime factorization or the Euclidean algorithm as appropriate, report a nonnegative result, use gcd(a,0)=abs(a), use lcm(a,0)=0 for nonzero a, and identify gcd(0,0) as undefined. For more than two integers, combine results consistently and do not switch to fraction LCD work unless asked.",
    examples: [
      { label: "GCD and LCM", expression: "Find the GCD and LCM of 84 and 126" },
      { label: "Three integers", expression: "Find the GCF of 36, 60, and 90" },
      { label: "Euclidean method", expression: "Find gcd(252, 198) using Euclid" },
    ],
    overview: {
      heading: "Common divisors and common multiples answer different questions",
      paragraphs: [
        "The greatest common divisor is the largest positive integer that divides every input without a remainder. GCF and HCF are common alternative names for the same value.",
        "The least common multiple is the smallest positive number divisible by every nonzero input. Prime factorization shows both answers at once: the GCD uses the lowest shared exponents, while the LCM uses the highest exponents that appear.",
      ],
    },
    formula: {
      title: "Product relationship for two nonzero integers",
      latex:
        "\\gcd(a,b)\\operatorname{lcm}(a,b)=|ab|",
      explanation:
        "Once either the GCD or LCM is known, this identity provides the other and offers a useful check.",
    },
    methods: [
      {
        title: "Compare prime factors",
        description:
          "Use the lowest common prime powers for the GCD and the highest prime powers present for the LCM.",
      },
      {
        title: "Use the Euclidean algorithm",
        description:
          "Repeatedly replace the larger pair with the divisor and remainder until the remainder is zero.",
      },
      {
        title: "Combine a longer list",
        description:
          "Find the result for the first two integers, then combine it with each remaining integer in turn.",
      },
    ],
    workedExample: {
      problem: "Find the GCD and LCM of 84 and 126",
      steps: [
        {
          latex: "84=2^2\\cdot3\\cdot7",
          note: "Write 84 as a product of primes.",
        },
        {
          latex: "126=2\\cdot3^2\\cdot7",
          note: "Write 126 using the same prime bases.",
        },
        {
          latex: "\\gcd(84,126)=2\\cdot3\\cdot7=42",
          note: "Take the smaller exponent for every shared prime.",
        },
        {
          latex: "\\operatorname{lcm}(84,126)=2^2\\cdot3^2\\cdot7=252",
          note: "Take the largest exponent that appears in either factorization.",
        },
      ],
      answer: "The GCD is 42 and the LCM is 252.",
    },
    mistakes: [
      {
        title: "Using the largest exponents for the GCD",
        description:
          "The GCD contains only factors shared by every input, so it uses the smallest shared exponent.",
      },
      {
        title: "Confusing GCD with LCM",
        description:
          "A divisor goes into each number. A common multiple is divisible by each number.",
      },
      {
        title: "Ignoring zero cases",
        description:
          "The GCD of a and zero is the absolute value of a, while the LCM of a and zero is zero when a is nonzero.",
      },
    ],
    faqs: [
      {
        question: "Are GCD, GCF, and HCF the same thing?",
        answer:
          "Yes. They are different names for the greatest positive integer that divides all supplied integers.",
      },
      {
        question: "Can I enter more than two numbers?",
        answer:
          "Yes. The GCD or LCM can be combined pair by pair across any finite list of integers.",
      },
      {
        question: "How are negative inputs handled?",
        answer:
          "Signs do not change divisibility, so GCD and LCM are conventionally reported as nonnegative values using absolute values.",
      },
      {
        question: "Which method is better for large numbers?",
        answer:
          "The Euclidean algorithm is usually faster for the GCD. The product relationship can then provide the LCM for two integers.",
      },
    ],
    related: ["fraction", "factoring", "simplify", "exponents"],
  },
  {
    slug: "word-problems",
    name: "Math Word Problem Solver",
    category: "General Math",
    seoTitle: "Math Word Problem Solver with Steps",
    description:
      "Turn arithmetic, ratio, percent, distance, and algebra word problems into equations. Follow the reasoning, units, solution, and final check.",
    keywords: [
      "math word problem solver",
      "word problem calculator",
      "solve math word problems",
      "word problem solver with steps",
    ],
    heading: "Math Word Problem Solver",
    heroDescription:
      "Translate a written problem into variables and equations, solve it in context, and check the answer with the original facts.",
    placeholder: "Paste the complete word problem, including all values and units",
    inputHint:
      "Include the full question, every number, and its units. If a diagram matters, describe its labels or upload a clear image.",
    solverInstruction:
      "Solve the submitted word problem by identifying the requested quantity, defining variables with units, listing the relevant facts, translating only those facts into equations or arithmetic relationships, solving step by step, and checking the result against every condition. Preserve units throughout and answer in a complete sentence. If information is missing or the wording permits multiple interpretations, state the precise missing fact or assumption instead of inventing data. Keep unrelated story details separate from the mathematical model.",
    examples: [
      {
        label: "Ticket totals",
        expression:
          "23 tickets cost $244. Adult tickets are $12 and student tickets are $8. How many of each?",
      },
      {
        label: "Rate problem",
        expression:
          "A cyclist rides 42 miles in 2.5 hours. What is the average speed?",
      },
      {
        label: "Percent discount",
        expression:
          "A $68 jacket is discounted 25%. What is the sale price before tax?",
      },
    ],
    overview: {
      heading: "The main work is translating the story",
      paragraphs: [
        "A word problem describes relationships in ordinary language. Solving it means deciding what is unknown, matching each number to its role and unit, and expressing the relevant relationships mathematically.",
        "A correct equation is not enough by itself. The numerical result must fit the original context, use the requested units, and satisfy every stated condition. Some problems also require an integer, positive value, or realistic rounding rule.",
      ],
    },
    formula: {
      title: "A general translation pattern",
      latex:
        "\\text{known relationship}\\longrightarrow\\text{equation in the unknown}\\longrightarrow\\text{checked solution}",
      explanation:
        "The specific equation changes with the story, but every reliable solution connects the given facts to the requested quantity.",
    },
    methods: [
      {
        title: "Identify the exact question",
        description:
          "Name the quantity being requested and assign variables with units before choosing operations.",
      },
      {
        title: "Translate one relationship at a time",
        description:
          "Turn each relevant sentence into an equation, rate, ratio, geometric formula, or arithmetic statement.",
      },
      {
        title: "Check in the story",
        description:
          "Substitute the result into the original conditions and confirm the size, sign, units, and rounding make sense.",
      },
    ],
    workedExample: {
      problem: "Find the numbers of adult and student tickets",
      steps: [
        {
          latex: "a+s=23",
          note: "Let a be adult tickets and s be student tickets. Their total is 23.",
        },
        {
          latex: "12a+8s=244",
          note: "Use each ticket price to model the total revenue.",
        },
        {
          latex: "8a+8s=184",
          note: "Multiply the ticket-count equation by 8.",
        },
        {
          latex: "4a=60\\quad\\Longrightarrow\\quad a=15,\\ s=8",
          note: "Subtract the equations, then use the total count to find the student tickets.",
        },
      ],
      answer: "There were 15 adult tickets and 8 student tickets; they total 23 tickets and $244.",
    },
    mistakes: [
      {
        title: "Using every number automatically",
        description:
          "Some details may be irrelevant. Include a number only when its role connects to the requested quantity.",
      },
      {
        title: "Dropping the units",
        description:
          "Units reveal whether quantities can be added, multiplied, or compared and help detect a wrong model.",
      },
      {
        title: "Accepting an impossible solution",
        description:
          "A negative count, fractional person, or value outside a stated limit may require rejecting a root or revisiting the equation.",
      },
    ],
    faqs: [
      {
        question: "What kinds of word problems can this solve?",
        answer:
          "It can handle many arithmetic, ratio, percent, rate, distance, age, mixture, geometry, and introductory algebra problems.",
      },
      {
        question: "Can I upload a photo of the problem?",
        answer:
          "Yes. Upload a clear image or PDF, then make sure the extracted wording includes every value, label, and requested quantity.",
      },
      {
        question: "What happens if the problem is missing information?",
        answer:
          "The solution should identify what is missing or state a necessary interpretation instead of inventing a value.",
      },
      {
        question: "Why does the final check matter?",
        answer:
          "An algebraic result can be calculated correctly yet fail a unit, count, sign, or other condition from the original story.",
      },
    ],
    related: ["percentage", "solve-for-x", "systems-of-equations", "distance-formula"],
  },
  {
    slug: "inverse-function",
    name: "Inverse Function Calculator",
    category: "Precalculus",
    seoTitle: "Inverse Function Calculator with Steps",
    description:
      "Find and verify an inverse function, check one-to-one conditions, and track swapped domain and range. Domain restrictions are shown when needed.",
    keywords: [
      "inverse function calculator",
      "find inverse function",
      "inverse functions with steps",
      "one to one function calculator",
    ],
    heading: "Inverse Function Calculator",
    heroDescription:
      "Reverse a one-to-one function, track domain restrictions, and verify the result by composition.",
    placeholder: "Enter a function, such as f(x) = (3x - 5)/2",
    inputHint: functionInputHint,
    solverInstruction:
      "Find the inverse of the stated function, not its reciprocal. Check whether the function is one-to-one on the supplied domain, identify any domain restriction needed for an inverse to be a function, write y=f(x), interchange x and y, solve for y, and label the result f^{-1}(x). Swap the original domain and range, preserve branch restrictions, and verify both compositions on their valid domains. For a short algebraic function, do not omit the two composition checks. If no single-valued inverse exists without a domain restriction, say so clearly rather than choosing an unstated branch.",
    examples: [
      { label: "Linear function", expression: "Find the inverse of f(x) = 3x - 7" },
      {
        label: "Rational function",
        expression: "Find the inverse of f(x) = (2x + 1)/(x - 3)",
      },
      {
        label: "Restricted quadratic",
        expression: "Find the inverse of f(x) = x^2 + 4 for x >= 0",
      },
    ],
    overview: {
      heading: "An inverse function reverses inputs and outputs",
      paragraphs: [
        "If a function sends an input x to an output y, its inverse sends that output y back to x. This reversal is possible as a function only when every output comes from one input on the chosen domain.",
        "The horizontal line test checks that one-to-one condition on a graph. Algebraically, finding the inverse swaps x and y and then solves for the new output. The domain of the inverse is the original range, and the inverse range is the original domain.",
      ],
    },
    formula: {
      title: "Composition check for inverse functions",
      latex:
        "f^{-1}(f(x))=x,\\qquad f(f^{-1}(x))=x",
      explanation:
        "Both identities must hold on the appropriate domains for the two functions to be inverses.",
    },
    methods: [
      {
        title: "Check the one-to-one condition",
        description:
          "Confirm that no output is produced by more than one input, or restrict the domain before finding an inverse.",
      },
      {
        title: "Swap and solve",
        description:
          "Write y = f(x), exchange x and y, and isolate y to obtain the inverse formula.",
      },
      {
        title: "Verify by composition",
        description:
          "Substitute each function into the other and simplify to x while respecting both domains.",
      },
    ],
    workedExample: {
      problem: "Find the inverse of f(x) = (3x - 5)/2",
      steps: [
        {
          latex: "y=\\frac{3x-5}{2}",
          note: "Write the function output as y.",
        },
        {
          latex: "x=\\frac{3y-5}{2}",
          note: "Interchange x and y to reverse the input-output relationship.",
        },
        {
          latex: "2x=3y-5\\quad\\Longrightarrow\\quad y=\\frac{2x+5}{3}",
          note: "Solve the swapped equation for y.",
        },
        {
          latex:
            "f\\!\\left(\\frac{2x+5}{3}\\right)=\\frac{2x+5-5}{2}=x",
          note: "Composition with the original function verifies the result.",
        },
      ],
      answer: "The inverse is f^(-1)(x) = (2x + 5)/3, with all real numbers as its domain and range.",
    },
    mistakes: [
      {
        title: "Taking the reciprocal",
        description:
          "The notation f^(-1) means inverse function, not 1/f(x).",
      },
      {
        title: "Ignoring a repeated output",
        description:
          "A function such as x squared needs a restricted domain before its inverse can be single-valued.",
      },
      {
        title: "Forgetting domain and range",
        description:
          "The inverse formula may be algebraically correct but incomplete without the branch and endpoint restrictions.",
      },
    ],
    faqs: [
      {
        question: "Does every function have an inverse function?",
        answer:
          "No. A function must be one-to-one on its domain, although a suitable domain restriction can sometimes make it invertible.",
      },
      {
        question: "Is an inverse function the same as a reciprocal?",
        answer:
          "No. An inverse reverses input and output, while a reciprocal is the expression 1/f(x).",
      },
      {
        question: "Why is the domain sometimes restricted?",
        answer:
          "Restricting the domain removes repeated outputs so the reversed relation assigns only one output to each input.",
      },
      {
        question: "How can I verify an inverse?",
        answer:
          "Compose the original and inverse functions in both orders. Each composition should simplify to x on its valid domain.",
      },
    ],
    related: ["function-composition", "domain-range", "solve-for-x", "logarithms"],
  },
  {
    slug: "function-composition",
    name: "Function Composition Calculator",
    category: "Precalculus",
    seoTitle: "Function Composition Calculator with Steps",
    description:
      "Find f(g(x)), g(f(x)), or a composite value with substitution steps. Simplify the result and keep all inner and outer domain restrictions.",
    keywords: [
      "function composition calculator",
      "composite function calculator",
      "f of g calculator",
      "evaluate composite functions",
    ],
    heading: "Function Composition Calculator",
    heroDescription:
      "Substitute one function into another in the correct order, simplify it, and determine where the composition is defined.",
    placeholder: "Enter f(x), g(x), and the order, such as find f(g(x))",
    inputHint: functionInputHint,
    solverInstruction:
      "Evaluate or simplify the exact function composition requested. Treat the inner function as the first operation and substitute its entire output into every occurrence of the outer function variable. Do not confuse f(g(x)) with f(x)g(x), preserve parentheses through substitution, simplify carefully, and determine the composite domain by requiring x to be in the inner domain and the inner output to lie in the outer domain. Do not assume f composed with g equals g composed with f.",
    examples: [
      {
        label: "Symbolic composition",
        expression: "f(x)=x^2+1, g(x)=3x-2. Find f(g(x)).",
      },
      {
        label: "Reverse order",
        expression: "f(x)=2x+5, g(x)=1/x. Find g(f(x)).",
      },
      {
        label: "Evaluate a value",
        expression: "f(x)=x^2-x, h(x)=3x+2. Find f(h(1)).",
      },
    ],
    overview: {
      heading: "Composition feeds one function into another",
      paragraphs: [
        "In f(g(x)), the function g acts first. Its output becomes the input of f. Parentheses are essential because the entire expression for g(x) replaces each occurrence of x in f.",
        "Order matters. The functions f composed with g and g composed with f usually produce different formulas and can have different domains. A composite input must be valid for the inner function, and the inner output must be accepted by the outer function.",
      ],
    },
    formula: {
      title: "Definition of function composition",
      latex:
        "(f\\circ g)(x)=f(g(x))",
      explanation:
        "Evaluate g first, then use its complete output as the input to f.",
    },
    methods: [
      {
        title: "Read from the inside out",
        description:
          "Identify the innermost function and calculate or substitute it before applying the outer function.",
      },
      {
        title: "Protect the substitution",
        description:
          "Place the complete inner expression in parentheses wherever the outer function uses its input.",
      },
      {
        title: "Check the composite domain",
        description:
          "Keep inputs valid for the inner function and exclude any whose inner outputs violate the outer function domain.",
      },
    ],
    workedExample: {
      problem: "Find f(g(x)) when f(x) = x^2 + 1 and g(x) = 3x - 2",
      steps: [
        {
          latex: "f(g(x))=(g(x))^2+1",
          note: "Replace the input of f with the entire expression g(x).",
        },
        {
          latex: "f(g(x))=(3x-2)^2+1",
          note: "Substitute the formula for g.",
        },
        {
          latex: "(3x-2)^2=9x^2-12x+4",
          note: "Expand the squared binomial.",
        },
        {
          latex: "f(g(x))=9x^2-12x+5",
          note: "Add the remaining constant and combine like terms.",
        },
      ],
      answer: "The composition is f(g(x)) = 9x^2 - 12x + 5 for every real x.",
    },
    mistakes: [
      {
        title: "Multiplying the function formulas",
        description:
          "The notation f(g(x)) means substitution, not the product f(x)g(x).",
      },
      {
        title: "Reversing the order",
        description:
          "In f(g(x)), g is evaluated first. Switching the order normally changes the result.",
      },
      {
        title: "Losing domain restrictions",
        description:
          "Simplification can hide a denominator or radical restriction inherited from either component function.",
      },
    ],
    faqs: [
      {
        question: "What does f composed with g mean?",
        answer:
          "It means apply g to the input first, then apply f to the output from g.",
      },
      {
        question: "Are f(g(x)) and g(f(x)) always equal?",
        answer:
          "No. Function composition is generally order-dependent, so the two formulas and their domains can differ.",
      },
      {
        question: "Is composition the same as multiplying functions?",
        answer:
          "No. Composition substitutes one function into another, while multiplication multiplies their output values.",
      },
      {
        question: "How is the domain of a composition found?",
        answer:
          "The input must belong to the inner function domain, and the inner output must belong to the outer function domain.",
      },
    ],
    related: ["inverse-function", "domain-range", "simplify", "polynomial"],
  },
  {
    slug: "domain-range",
    name: "Domain and Range Calculator",
    category: "Precalculus",
    seoTitle: "Domain and Range Calculator with Steps",
    description:
      "Find the real domain and range of a formula in interval or set-builder notation. See denominator, radical, logarithm, and output restrictions.",
    keywords: [
      "domain and range calculator",
      "find domain calculator",
      "find range calculator",
      "domain interval notation calculator",
    ],
    heading: "Domain and Range Calculator",
    heroDescription:
      "Find valid inputs and possible outputs from a function formula, with restrictions written in interval or set-builder notation.",
    placeholder: "Enter a function, such as f(x) = sqrt(x - 3) + 2",
    inputHint:
      "Enter the full formula and state any given domain. This tool analyzes formulas, not an unlabeled graph image.",
    solverInstruction:
      "Find the real-valued domain and range of the supplied function formula unless another number system is stated. For the domain, enforce nonzero denominators, nonnegative even-root radicands, positive logarithm arguments, and any stated piecewise or inverse-function restrictions. For the range, analyze the outputs using algebra, monotonic behavior, extrema, transformations, or an inverse relation as appropriate. Preserve holes and asymptotic exclusions, distinguish an approached value from an attained value, and report interval notation plus set-builder notation when useful. Do not claim to read an unlabeled graph that was not supplied clearly.",
    examples: [
      { label: "Radical function", expression: "Find domain and range of sqrt(x-3)+2" },
      {
        label: "Rational function",
        expression: "Find domain and range of (x+1)/(x-2)",
      },
      {
        label: "Quadratic function",
        expression: "Find domain and range of -2(x-1)^2+5",
      },
    ],
    overview: {
      heading: "Domain describes inputs and range describes outputs",
      paragraphs: [
        "The domain is the set of inputs for which a function is defined. A formula can exclude inputs through division by zero, even roots of negative values, logarithms of nonpositive values, or an explicit restriction.",
        "The range is the set of outputs the function can actually produce. Finding it may require solving for the input, locating a maximum or minimum, using known parent-function ranges, and checking whether boundary or asymptotic values are attained.",
      ],
    },
    formula: {
      title: "Domain and range as sets",
      latex:
        "\\operatorname{Dom}(f)=\\{x\\in\\mathbb{R}:f(x)\\text{ is defined}\\},\\quad \\operatorname{Range}(f)=\\{f(x):x\\in\\operatorname{Dom}(f)\\}",
      explanation:
        "The domain filters valid inputs. The range collects every output produced by those inputs.",
    },
    methods: [
      {
        title: "Find every input restriction",
        description:
          "Check denominators, even roots, logarithms, piecewise conditions, and any domain stated with the function.",
      },
      {
        title: "Analyze possible outputs",
        description:
          "Use transformations, extrema, asymptotes, or solve x in terms of y to determine which outputs occur.",
      },
      {
        title: "Choose endpoint notation carefully",
        description:
          "Use a bracket only when a finite endpoint is included. Infinity always takes a parenthesis.",
      },
    ],
    workedExample: {
      problem: "Find the domain and range of f(x) = sqrt(x - 3) + 2",
      steps: [
        {
          latex: "x-3\\ge0",
          note: "A real square root requires a nonnegative radicand.",
        },
        {
          latex: "x\\ge3\\quad\\Longrightarrow\\quad \\operatorname{Dom}(f)=[3,\\infty)",
          note: "Solve the domain restriction and write it in interval notation.",
        },
        {
          latex: "\\sqrt{x-3}\\ge0",
          note: "The principal square root cannot produce a negative value.",
        },
        {
          latex: "f(x)=\\sqrt{x-3}+2\\ge2\\quad\\Longrightarrow\\quad \\operatorname{Range}(f)=[2,\\infty)",
          note: "The vertical shift raises the smallest output from 0 to 2.",
        },
      ],
      answer: "The domain is [3, infinity) and the range is [2, infinity).",
    },
    mistakes: [
      {
        title: "Checking only the denominator",
        description:
          "Radicals, logarithms, inverse functions, and piecewise conditions can also restrict the domain.",
      },
      {
        title: "Treating an asymptote as included",
        description:
          "A function may approach a value indefinitely without ever producing that output.",
      },
      {
        title: "Using brackets with infinity",
        description:
          "Infinity is not a reachable endpoint, so interval notation always uses a parenthesis beside it.",
      },
    ],
    faqs: [
      {
        question: "What is the difference between domain and range?",
        answer:
          "Domain is the set of allowed inputs. Range is the set of outputs produced from those inputs.",
      },
      {
        question: "Why are denominator zeros excluded?",
        answer:
          "A function is undefined where its formula requires division by zero, even if later algebra appears to cancel the factor.",
      },
      {
        question: "Can the answer use interval notation?",
        answer:
          "Yes. The result can include interval notation and an equivalent set-builder condition.",
      },
      {
        question: "Can this find domain and range from a graph?",
        answer:
          "This page is designed for function formulas. A clearly labeled uploaded problem may help, but an unlabeled graph should not be treated as reliable formula input.",
      },
    ],
    related: ["inverse-function", "function-composition", "rational-expressions", "logarithms"],
  },
] satisfies CalculatorDefinition[];
