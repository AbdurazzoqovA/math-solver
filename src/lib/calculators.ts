import { calculusCalculators } from "./calculus-calculators";
import { generalPrecalculusCalculators } from "./general-precalculus-calculators";
import { graphingCalculators } from "./graphing-calculator";
import { linearAlgebraCalculators } from "./linear-algebra-calculators";
import { statisticsCalculators } from "./statistics-calculators";
import { trigonometryCalculators } from "./trigonometry-calculators";

export type CalculatorExample = {
  label: string;
  expression: string;
};

export type CalculatorTool = {
  kind: "graphing";
  initialExpressions: string[];
};

export const calculatorCategories = [
  "General Math",
  "Algebra",
  "Precalculus",
  "Trigonometry",
  "Calculus",
  "Linear Algebra",
  "Statistics",
  "Graphing",
] as const;

export type CalculatorCategory = (typeof calculatorCategories)[number];

export type CalculatorDefinition = {
  slug: string;
  name: string;
  category: CalculatorCategory;
  seoTitle: string;
  description: string;
  keywords: string[];
  heading: string;
  heroDescription: string;
  placeholder: string;
  inputHint?: string;
  solverInstruction?: string;
  tool?: CalculatorTool;
  examples: CalculatorExample[];
  overview: {
    heading: string;
    paragraphs: string[];
  };
  formula: {
    title: string;
    latex: string;
    explanation: string;
  };
  methods: {
    title: string;
    description: string;
  }[];
  workedExample: {
    problem: string;
    steps: {
      latex: string;
      note: string;
    }[];
    answer: string;
  };
  mistakes: {
    title: string;
    description: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  related: string[];
};

const algebraPrecalculusCalculators = [
  {
    slug: "solve-for-x",
    name: "Solve for X Calculator",
    category: "Algebra",
    seoTitle: "Solve for X Calculator with Steps",
    description:
      "Solve for x in linear, quadratic, rational, and radical equations. See every algebra step, check the result, and ask follow-up questions for free.",
    keywords: [
      "solve for x calculator",
      "find x calculator",
      "equation solver for x",
      "solve for x with steps",
    ],
    heading: "Solve for X Calculator",
    heroDescription:
      "Enter an equation and see how to isolate x, simplify both sides, and check the result.",
    placeholder: "Enter an equation, such as 3(x + 2) = x + 14",
    examples: [
      { label: "Two-step equation", expression: "5x - 7 = 23" },
      { label: "Variables on both sides", expression: "3(x + 2) = x + 14" },
      { label: "Equation with fractions", expression: "x/3 + 5 = 12" },
    ],
    overview: {
      heading: "What solving for x actually means",
      paragraphs: [
        "Solving for x means finding every value that makes an equation true. The usual goal is to get x alone on one side while keeping the equation balanced.",
        "The calculator handles more than one-step equations. You can enter parentheses, fractions, powers, roots, or variables on both sides. The solution explains which inverse operation is used at each point.",
      ],
    },
    formula: {
      title: "The balance rule",
      latex: "a=b \\quad \\Longrightarrow \\quad a+c=b+c",
      explanation:
        "Whatever operation you apply to one side of an equation must also be applied to the other side.",
    },
    methods: [
      {
        title: "Undo addition and subtraction",
        description:
          "Move constant terms away from x first. This leaves the variable term easier to isolate.",
      },
      {
        title: "Undo multiplication and division",
        description:
          "Divide by the coefficient of x, or multiply through a denominator, without changing the balance.",
      },
      {
        title: "Check the solution",
        description:
          "Substitute the result into the original equation. Both sides should evaluate to the same number.",
      },
    ],
    workedExample: {
      problem: "Solve 3(x + 2) = x + 14",
      steps: [
        { latex: "3x+6=x+14", note: "Distribute 3 across the parentheses." },
        { latex: "2x+6=14", note: "Subtract x from both sides." },
        { latex: "2x=8", note: "Subtract 6 from both sides." },
        { latex: "x=4", note: "Divide both sides by 2." },
      ],
      answer: "Checking gives 3(4 + 2) = 18 and 4 + 14 = 18, so x = 4.",
    },
    mistakes: [
      {
        title: "Changing only one side",
        description:
          "An equation stops being equivalent if an operation is applied to only one side.",
      },
      {
        title: "Missing a distribution term",
        description:
          "In 3(x + 2), the 3 multiplies both x and 2.",
      },
      {
        title: "Stopping before the check",
        description:
          "A quick substitution catches sign errors and invalid roots.",
      },
    ],
    faqs: [
      {
        question: "Can this calculator solve for variables other than x?",
        answer:
          "Yes. Enter an equation and state the variable you want, such as “solve 2a + b = 10 for a.”",
      },
      {
        question: "Can it solve equations with x on both sides?",
        answer:
          "Yes. It collects the x terms on one side, combines constants on the other, and shows each balancing step.",
      },
      {
        question: "What happens if an equation has no solution?",
        answer:
          "The solution will identify a contradiction, such as 0 = 5, and explain why no value of x works.",
      },
      {
        question: "Is the solve for x calculator free?",
        answer:
          "Yes. Full steps and follow-up questions are free, and no account is required.",
      },
    ],
    related: ["systems-of-equations", "inequalities", "quadratic-equation", "simplify"],
  },
  {
    slug: "quadratic-equation",
    name: "Quadratic Equation Calculator",
    category: "Algebra",
    seoTitle: "Quadratic Equation Calculator with Steps",
    description:
      "Solve quadratic equations by factoring, completing the square, or using the quadratic formula. Get exact roots, decimal values, and clear steps.",
    keywords: [
      "quadratic equation calculator",
      "quadratic formula calculator",
      "quadratic solver with steps",
      "find quadratic roots",
    ],
    heading: "Quadratic Equation Calculator",
    heroDescription:
      "Find real or complex roots and see which quadratic method fits the equation.",
    placeholder: "Enter a quadratic equation, such as 2x^2 - 5x - 3 = 0",
    examples: [
      { label: "Factorable quadratic", expression: "x^2 - 5x + 6 = 0" },
      { label: "Use the formula", expression: "2x^2 - 5x - 3 = 0" },
      { label: "Complex roots", expression: "x^2 + 4x + 8 = 0" },
    ],
    overview: {
      heading: "Choose a method that fits the quadratic",
      paragraphs: [
        "A quadratic equation has degree two and can be written in standard form as ax² + bx + c = 0, where a is not zero. Depending on the coefficients, it may have two real roots, one repeated root, or two complex roots.",
        "Factoring is usually quickest when the roots are simple. Completing the square makes vertex form visible. The quadratic formula works for every quadratic equation and is the safest general method.",
      ],
    },
    formula: {
      title: "Quadratic formula",
      latex: "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}",
      explanation:
        "The discriminant b² - 4ac tells you whether the roots are real, repeated, or complex.",
    },
    methods: [
      {
        title: "Factoring",
        description:
          "Rewrite the quadratic as a product and set each factor equal to zero.",
      },
      {
        title: "Completing the square",
        description:
          "Build a perfect square trinomial, then take square roots to isolate x.",
      },
      {
        title: "Quadratic formula",
        description:
          "Substitute a, b, and c carefully. This method works even when the expression does not factor over the integers.",
      },
    ],
    workedExample: {
      problem: "Solve 2x² - 5x - 3 = 0",
      steps: [
        { latex: "a=2,\\quad b=-5,\\quad c=-3", note: "Read the coefficients from standard form." },
        { latex: "b^2-4ac=25+24=49", note: "Compute the discriminant." },
        { latex: "x=\\frac{5\\pm\\sqrt{49}}{4}", note: "Substitute into the quadratic formula." },
        { latex: "x=3\\quad\\text{or}\\quad x=-\\frac12", note: "Evaluate both signs." },
      ],
      answer: "The equation has two real roots: x = 3 and x = -1/2.",
    },
    mistakes: [
      {
        title: "Using the wrong sign for b",
        description:
          "If the equation contains -5x, then b = -5 and -b = 5.",
      },
      {
        title: "Dividing only the radical",
        description:
          "The entire numerator, including -b and the radical, is divided by 2a.",
      },
      {
        title: "Ignoring complex roots",
        description:
          "A negative discriminant gives complex roots rather than no roots.",
      },
    ],
    faqs: [
      {
        question: "Does the calculator show the quadratic formula steps?",
        answer:
          "Yes. It identifies a, b, and c, evaluates the discriminant, substitutes the values, and simplifies both roots.",
      },
      {
        question: "Can it solve quadratics that do not factor?",
        answer:
          "Yes. The quadratic formula and completing the square work when integer factoring does not.",
      },
      {
        question: "What does the discriminant tell me?",
        answer:
          "A positive discriminant gives two real roots, zero gives one repeated real root, and a negative value gives two complex roots.",
      },
      {
        question: "Can I enter a quadratic that is not equal to zero?",
        answer:
          "Yes. The solver first moves all terms to one side, then solves the resulting standard-form equation.",
      },
    ],
    related: ["factoring", "complete-the-square", "polynomial", "solve-for-x"],
  },
  {
    slug: "simplify",
    name: "Simplify Calculator",
    category: "Algebra",
    seoTitle: "Simplify Calculator for Algebra Expressions",
    description:
      "Simplify algebraic expressions with fractions, powers, roots, and like terms. Follow each rewrite and learn which algebra rule was used.",
    keywords: [
      "simplify calculator",
      "simplifying expressions calculator",
      "algebra simplifier",
      "simplify with steps",
    ],
    heading: "Simplify Calculator",
    heroDescription:
      "Combine like terms, reduce fractions, and rewrite expressions in a cleaner equivalent form.",
    placeholder: "Enter an expression, such as 3(2x - 4) + 5x",
    examples: [
      { label: "Combine like terms", expression: "3x + 2y - x + 5y" },
      { label: "Distribute first", expression: "3(2x - 4) + 5x" },
      { label: "Simplify a fraction", expression: "(x^2 - 9)/(x - 3)" },
    ],
    overview: {
      heading: "Simpler form, same value",
      paragraphs: [
        "Simplifying changes the form of an expression without changing its value. A good final form has combined like terms, reduced numerical fractions, and no unnecessary parentheses.",
        "There is not always one universally preferred form. For example, factored form can reveal zeros while expanded form can make like terms easier to compare. The steps explain why each rewrite is equivalent.",
      ],
    },
    formula: {
      title: "Distributive property",
      latex: "a(b+c)=ab+ac",
      explanation:
        "Distribution removes parentheses and often exposes terms that can be combined.",
    },
    methods: [
      {
        title: "Remove grouping symbols",
        description:
          "Apply distribution carefully, including a negative sign in front of parentheses.",
      },
      {
        title: "Combine like terms",
        description:
          "Only terms with the same variable part and exponents can be added or subtracted.",
      },
      {
        title: "Reduce factors",
        description:
          "Cancel common factors in rational expressions while keeping excluded values in mind.",
      },
    ],
    workedExample: {
      problem: "Simplify 3(2x - 4) + 5x",
      steps: [
        { latex: "6x-12+5x", note: "Distribute 3 to both terms." },
        { latex: "(6x+5x)-12", note: "Group the like x terms." },
        { latex: "11x-12", note: "Add their coefficients." },
      ],
      answer: "The simplified expression is 11x - 12.",
    },
    mistakes: [
      {
        title: "Combining unlike terms",
        description:
          "Terms such as 3x and 3x² have different variable parts and cannot be combined.",
      },
      {
        title: "Canceling terms instead of factors",
        description:
          "Cancellation works across multiplication, not across addition.",
      },
      {
        title: "Losing a negative sign",
        description:
          "A minus sign before parentheses changes the sign of every term inside.",
      },
    ],
    faqs: [
      {
        question: "What kinds of expressions can this calculator simplify?",
        answer:
          "It can work with polynomials, rational expressions, radicals, exponents, logarithms, and combinations of those forms.",
      },
      {
        question: "Is simplifying the same as solving?",
        answer:
          "No. Simplifying rewrites an expression. Solving finds values that make an equation true.",
      },
      {
        question: "Does the calculator show restrictions on variables?",
        answer:
          "Yes, when a simplification cancels a denominator factor, the original excluded values should remain part of the result.",
      },
      {
        question: "Can it simplify expressions from a photo?",
        answer:
          "Yes. Upload a clear image or PDF and the solver can read the expression before showing the simplification.",
      },
    ],
    related: ["factoring", "rational-expressions", "exponents", "polynomial"],
  },
  {
    slug: "factoring",
    name: "Factoring Calculator",
    category: "Algebra",
    seoTitle: "Factoring Calculator with Step-by-Step Work",
    description:
      "Factor polynomials using the GCF, trinomial patterns, grouping, and special products. See the factorization and check it by expanding.",
    keywords: [
      "factoring calculator",
      "factor polynomial calculator",
      "factoring calculator with steps",
      "trinomial factoring calculator",
    ],
    heading: "Factoring Calculator",
    heroDescription:
      "Break a polynomial into factors using the pattern that fits, then verify by expanding.",
    placeholder: "Enter a polynomial, such as 6x^2 + 11x - 10",
    examples: [
      { label: "Simple trinomial", expression: "x^2 + 5x + 6" },
      { label: "Leading coefficient", expression: "6x^2 + 11x - 10" },
      { label: "Difference of squares", expression: "9x^2 - 25" },
    ],
    overview: {
      heading: "Factoring reverses multiplication",
      paragraphs: [
        "To factor a polynomial, rewrite it as a product of simpler expressions. The first check is always the greatest common factor. After that, the number of terms and the exponent pattern suggest what to try.",
        "A complete factorization should multiply back to the original polynomial. Expanding the answer is a reliable check and makes sign mistakes easy to spot.",
      ],
    },
    formula: {
      title: "Difference of squares",
      latex: "a^2-b^2=(a-b)(a+b)",
      explanation:
        "Two perfect squares separated by subtraction factor into conjugate binomials.",
    },
    methods: [
      {
        title: "Greatest common factor",
        description:
          "Pull out the largest factor shared by every term before using any other pattern.",
      },
      {
        title: "Trinomial factoring",
        description:
          "Find terms whose product matches ac and whose sum matches b, then group.",
      },
      {
        title: "Special products",
        description:
          "Recognize differences of squares and perfect square trinomials before doing longer work.",
      },
    ],
    workedExample: {
      problem: "Factor 6x² + 11x - 10",
      steps: [
        { latex: "ac=6(-10)=-60", note: "Multiply the leading coefficient and constant." },
        { latex: "15+(-4)=11", note: "Choose factors of -60 that add to 11." },
        { latex: "6x^2+15x-4x-10", note: "Split the middle term." },
        { latex: "3x(2x+5)-2(2x+5)", note: "Factor each group." },
        { latex: "(3x-2)(2x+5)", note: "Factor out the shared binomial." },
      ],
      answer: "The complete factorization is (3x - 2)(2x + 5).",
    },
    mistakes: [
      {
        title: "Skipping the GCF",
        description:
          "A result is not fully factored if all terms still share a common factor.",
      },
      {
        title: "Using sum of squares as a real pattern",
        description:
          "a² + b² does not factor over the real numbers in the same way as a² - b².",
      },
      {
        title: "Not multiplying back",
        description:
          "A quick expansion verifies the middle term and both signs.",
      },
    ],
    faqs: [
      {
        question: "Can this calculator factor trinomials when a is not 1?",
        answer:
          "Yes. It can use the AC method, grouping, or another suitable method and show the intermediate steps.",
      },
      {
        question: "Can it factor higher-degree polynomials?",
        answer:
          "Yes. It can test common factors, grouping, substitutions, and rational roots when those methods apply.",
      },
      {
        question: "What if a polynomial is prime?",
        answer:
          "The result will explain that it is irreducible over the chosen number system rather than forcing an invalid factorization.",
      },
      {
        question: "Does factoring help solve equations?",
        answer:
          "Yes. Once a polynomial equation is written as a product equal to zero, the zero-product property can be used to find its roots.",
      },
    ],
    related: ["quadratic-equation", "polynomial", "simplify", "complete-the-square"],
  },
  {
    slug: "systems-of-equations",
    name: "Systems of Equations Calculator",
    category: "Algebra",
    seoTitle: "Systems of Equations Calculator with Steps",
    description:
      "Solve linear systems by substitution, elimination, or matrix methods. See each step and identify one solution, no solution, or infinitely many.",
    keywords: [
      "systems of equations calculator",
      "simultaneous equations solver",
      "system of equations solver with steps",
      "elimination calculator",
    ],
    heading: "Systems of Equations Calculator",
    heroDescription:
      "Solve two or more equations together with substitution, elimination, or row operations.",
    placeholder: "Enter equations, such as 2x + y = 7, x - y = 2",
    examples: [
      { label: "Two variables", expression: "2x + y = 7, x - y = 2" },
      { label: "Elimination", expression: "3x + 2y = 12, 5x - 2y = 4" },
      { label: "Three variables", expression: "x+y+z=6, 2x-y+z=3, x+2y-z=2" },
    ],
    overview: {
      heading: "Find values that satisfy every equation",
      paragraphs: [
        "A system is solved only when the same variable values make all of its equations true. For two linear equations, the solution is the point where their lines intersect.",
        "Substitution is convenient when one variable is already isolated. Elimination is often faster when coefficients line up. Larger systems can be organized with an augmented matrix and row operations.",
      ],
    },
    formula: {
      title: "A two-variable linear system",
      latex: "\\begin{cases}a_1x+b_1y=c_1\\\\a_2x+b_2y=c_2\\end{cases}",
      explanation:
        "The pair (x, y) must satisfy both equations at the same time.",
    },
    methods: [
      {
        title: "Substitution",
        description:
          "Solve one equation for a variable and replace that variable in the other equation.",
      },
      {
        title: "Elimination",
        description:
          "Add or subtract equivalent equations so one variable cancels.",
      },
      {
        title: "Row reduction",
        description:
          "Use legal row operations on an augmented matrix, especially for systems with three or more variables.",
      },
    ],
    workedExample: {
      problem: "Solve 2x + y = 7 and x - y = 2",
      steps: [
        { latex: "3x=9", note: "Add the equations to eliminate y." },
        { latex: "x=3", note: "Divide by 3." },
        { latex: "3-y=2", note: "Substitute x = 3 into the second equation." },
        { latex: "y=1", note: "Solve the remaining one-variable equation." },
      ],
      answer: "The system has one solution: (3, 1).",
    },
    mistakes: [
      {
        title: "Changing only part of an equation",
        description:
          "When multiplying an equation for elimination, every term must be multiplied.",
      },
      {
        title: "Stopping after one variable",
        description:
          "Substitute back to find the remaining variables and report an ordered pair or tuple.",
      },
      {
        title: "Assuming every system has one solution",
        description:
          "Parallel lines give no solution, while equivalent equations give infinitely many solutions.",
      },
    ],
    faqs: [
      {
        question: "How should I enter a system of equations?",
        answer:
          "Separate equations with a comma or a new line. Include an equals sign in each equation.",
      },
      {
        question: "Can the calculator solve three equations?",
        answer:
          "Yes. Enter all three equations and variables. The solver can use elimination or matrix row reduction.",
      },
      {
        question: "How does it show no solution?",
        answer:
          "The steps will end in a contradiction, such as 0 = 4, which means the equations are inconsistent.",
      },
      {
        question: "Can it solve nonlinear systems?",
        answer:
          "Yes, although nonlinear systems may have several solutions and may require substitution, factoring, or numerical methods.",
      },
    ],
    related: ["solve-for-x", "inequalities", "slope", "polynomial"],
  },
  {
    slug: "inequalities",
    name: "Inequality Calculator",
    category: "Algebra",
    seoTitle: "Inequality Calculator with Step-by-Step Work",
    description:
      "Solve linear, compound, polynomial, and rational inequalities. Get interval notation, boundary points, and clear sign-change explanations.",
    keywords: [
      "inequality calculator",
      "inequality solver with steps",
      "solve inequalities calculator",
      "interval notation calculator",
    ],
    heading: "Inequality Calculator",
    heroDescription:
      "Solve an inequality, track sign changes, and write the answer in interval notation.",
    placeholder: "Enter an inequality, such as -3x + 7 > 19",
    examples: [
      { label: "Linear inequality", expression: "-3x + 7 > 19" },
      { label: "Compound inequality", expression: "2 < 3x - 1 <= 11" },
      { label: "Polynomial inequality", expression: "x^2 - 5x + 6 <= 0" },
    ],
    overview: {
      heading: "An inequality usually has a range of answers",
      paragraphs: [
        "Instead of finding a single value, an inequality asks which values make one side larger or smaller than the other. The result is often shown on a number line or in interval notation.",
        "Linear inequalities follow familiar equation rules with one important exception: multiplying or dividing by a negative number reverses the inequality sign. Polynomial and rational inequalities also require testing intervals around critical points.",
      ],
    },
    formula: {
      title: "The sign reversal rule",
      latex: "a<b \\quad \\Longrightarrow \\quad -a>-b",
      explanation:
        "Multiplying or dividing both sides by a negative number reverses the order.",
    },
    methods: [
      {
        title: "Isolate the variable",
        description:
          "Use inverse operations just as you would for an equation, while watching for negative division.",
      },
      {
        title: "Find boundary points",
        description:
          "Set polynomial factors or rational numerators and denominators equal to zero.",
      },
      {
        title: "Test the intervals",
        description:
          "Choose a value from each interval to determine where the original inequality is true.",
      },
    ],
    workedExample: {
      problem: "Solve -3x + 7 > 19",
      steps: [
        { latex: "-3x>12", note: "Subtract 7 from both sides." },
        { latex: "x<-4", note: "Divide by -3 and reverse the inequality sign." },
        { latex: "(-\\infty,-4)", note: "Write the strict inequality in interval notation." },
      ],
      answer: "The solution is x < -4.",
    },
    mistakes: [
      {
        title: "Forgetting to reverse the sign",
        description:
          "The inequality symbol flips only when multiplying or dividing by a negative value.",
      },
      {
        title: "Including an undefined endpoint",
        description:
          "A value that makes a denominator zero is never included.",
      },
      {
        title: "Testing the simplified expression incorrectly",
        description:
          "Test points in the original inequality when you are unsure about a transformation.",
      },
    ],
    faqs: [
      {
        question: "Does the calculator give interval notation?",
        answer:
          "Yes. It can show inequality notation and interval notation, including open or closed endpoints.",
      },
      {
        question: "Can it solve compound inequalities?",
        answer:
          "Yes. Enter the full statement, such as 2 < 3x - 1 <= 11, and it will preserve both bounds.",
      },
      {
        question: "Why does the inequality sign sometimes flip?",
        answer:
          "Multiplication or division by a negative reverses the order of numbers, so the symbol must reverse too.",
      },
      {
        question: "Can it solve rational inequalities?",
        answer:
          "Yes. It finds zeros and undefined points, builds sign intervals, and excludes values outside the original domain.",
      },
    ],
    related: ["solve-for-x", "factoring", "rational-expressions", "systems-of-equations"],
  },
  {
    slug: "exponents",
    name: "Exponent Calculator",
    category: "Algebra",
    seoTitle: "Exponent Calculator with Simplifying Steps",
    description:
      "Simplify powers, negative exponents, rational exponents, and exponential equations. See the exponent law used at every step.",
    keywords: [
      "exponent calculator",
      "exponent solver",
      "simplify exponents calculator",
      "power calculator with steps",
    ],
    heading: "Exponent Calculator",
    heroDescription:
      "Simplify powers and solve exponential equations with the exponent laws shown clearly.",
    placeholder: "Enter a power or equation, such as (x^3 x^5)/x^2",
    examples: [
      { label: "Product of powers", expression: "(x^3 * x^5)/x^2" },
      { label: "Negative exponent", expression: "simplify 4x^-3" },
      { label: "Exponential equation", expression: "2^(x+1) = 16" },
    ],
    overview: {
      heading: "Exponents describe repeated multiplication",
      paragraphs: [
        "Exponent rules make large products compact, but the rules depend on matching bases and on whether powers are multiplied, divided, or raised again.",
        "Negative exponents create reciprocals, not negative values. Rational exponents connect powers with roots. For exponential equations, rewriting both sides with a common base is often the cleanest first move.",
      ],
    },
    formula: {
      title: "Core exponent laws",
      latex: "a^m a^n=a^{m+n},\\quad \\frac{a^m}{a^n}=a^{m-n},\\quad (a^m)^n=a^{mn}",
      explanation:
        "These laws apply to matching nonzero bases. The operation outside the powers determines what happens to the exponents.",
    },
    methods: [
      {
        title: "Match the bases",
        description:
          "Rewrite numerical powers with a common base when possible.",
      },
      {
        title: "Apply one exponent law at a time",
        description:
          "Keep product, quotient, and power-of-a-power rules separate to avoid mixing them.",
      },
      {
        title: "Rewrite negative powers",
        description:
          "Move a factor across the fraction bar and make its exponent positive.",
      },
    ],
    workedExample: {
      problem: "Simplify (x³ · x⁵) / x²",
      steps: [
        { latex: "x^{3+5}", note: "Add exponents when multiplying equal bases." },
        { latex: "\\frac{x^8}{x^2}=x^{8-2}", note: "Subtract exponents when dividing equal bases." },
        { latex: "x^6", note: "Simplify the exponent." },
      ],
      answer: "For x not equal to zero, the expression simplifies to x⁶.",
    },
    mistakes: [
      {
        title: "Adding exponents across addition",
        description:
          "The product rule applies to multiplication, not to aᵐ + aⁿ.",
      },
      {
        title: "Treating a negative exponent as a negative number",
        description:
          "a⁻ⁿ means 1/aⁿ when a is not zero.",
      },
      {
        title: "Forgetting to power every factor",
        description:
          "In (ab)ⁿ, the exponent applies to both a and b.",
      },
    ],
    faqs: [
      {
        question: "Can the calculator simplify negative exponents?",
        answer:
          "Yes. It rewrites them as reciprocals and explains any restrictions caused by zero denominators.",
      },
      {
        question: "Can it work with fractional exponents?",
        answer:
          "Yes. Rational exponents can be rewritten as roots, such as x^(1/2) = √x.",
      },
      {
        question: "Does it solve exponential equations?",
        answer:
          "Yes. It can match bases or use logarithms when a common-base rewrite is not available.",
      },
      {
        question: "What is any nonzero number to the zero power?",
        answer:
          "It equals 1. The expression 0⁰ is a separate indeterminate case in many contexts.",
      },
    ],
    related: ["logarithms", "simplify", "polynomial", "solve-for-x"],
  },
  {
    slug: "logarithms",
    name: "Logarithm Calculator",
    category: "Precalculus",
    seoTitle: "Logarithm Calculator with Step-by-Step Work",
    description:
      "Evaluate logs, expand or condense expressions, change bases, and solve logarithmic equations. See domain checks and exact steps.",
    keywords: [
      "logarithm calculator",
      "log calculator with steps",
      "log equation solver",
      "expand logarithms calculator",
    ],
    heading: "Logarithm Calculator",
    heroDescription:
      "Evaluate, expand, condense, or solve logarithms while keeping every domain restriction visible.",
    placeholder: "Enter a logarithm, such as log_2(x - 1) = 3",
    examples: [
      { label: "Evaluate a log", expression: "log_2(32)" },
      { label: "Solve a log equation", expression: "log_2(x - 1) = 3" },
      { label: "Expand logs", expression: "expand ln((x^2 sqrt(y))/z)" },
    ],
    overview: {
      heading: "A logarithm asks for an exponent",
      paragraphs: [
        "The statement log base b of a equals c means b raised to c equals a. This definition is the bridge between logarithmic and exponential form.",
        "Log properties can turn products into sums, quotients into differences, and powers into coefficients. They do not split a logarithm of a sum. Every real logarithm also requires a positive argument.",
      ],
    },
    formula: {
      title: "Logarithmic and exponential form",
      latex: "\\log_b(a)=c \\quad \\Longleftrightarrow \\quad b^c=a",
      explanation:
        "For real logarithms, b must be positive and not equal to 1, and a must be positive.",
    },
    methods: [
      {
        title: "Rewrite in exponential form",
        description:
          "This is often the shortest path when a logarithm equals a constant.",
      },
      {
        title: "Use log properties",
        description:
          "Expand products and powers, or condense compatible terms into one logarithm.",
      },
      {
        title: "Check the domain",
        description:
          "Reject any candidate that makes a logarithm argument zero or negative.",
      },
    ],
    workedExample: {
      problem: "Solve log₂(x - 1) = 3",
      steps: [
        { latex: "x-1=2^3", note: "Rewrite the logarithm in exponential form." },
        { latex: "x-1=8", note: "Evaluate the power." },
        { latex: "x=9", note: "Add 1 to both sides." },
        { latex: "x-1=8>0", note: "Check the logarithm domain." },
      ],
      answer: "The valid solution is x = 9.",
    },
    mistakes: [
      {
        title: "Splitting a sum",
        description:
          "log(a + b) is not equal to log(a) + log(b).",
      },
      {
        title: "Keeping an extraneous answer",
        description:
          "A solved candidate is invalid if any original log argument is not positive.",
      },
      {
        title: "Mixing log bases",
        description:
          "Product and quotient properties require logarithms with the same base.",
      },
    ],
    faqs: [
      {
        question: "Can the calculator use any logarithm base?",
        answer:
          "Yes. Write the base explicitly, such as log_2(32), or use log for base 10 and ln for base e.",
      },
      {
        question: "Can it expand and condense logarithms?",
        answer:
          "Yes. State which form you want and it will apply the product, quotient, and power properties.",
      },
      {
        question: "Why are some logarithm solutions rejected?",
        answer:
          "Real logarithms only accept positive arguments, so algebraic candidates must be checked in the original equation.",
      },
      {
        question: "How does the change-of-base formula work?",
        answer:
          "It rewrites log base b of x as ln(x)/ln(b), or as the same quotient using any other valid base.",
      },
    ],
    related: ["exponents", "solve-for-x", "rational-expressions", "polynomial"],
  },
  {
    slug: "polynomial",
    name: "Polynomial Calculator",
    category: "Precalculus",
    seoTitle: "Polynomial Calculator with Step-by-Step Work",
    description:
      "Add, multiply, divide, factor, and solve polynomials. Find roots, remainders, degree, and leading terms with each algebra step shown.",
    keywords: [
      "polynomial calculator",
      "polynomial solver",
      "polynomial operations calculator",
      "find polynomial roots",
    ],
    heading: "Polynomial Calculator",
    heroDescription:
      "Work with polynomial operations, factors, roots, and remainders in one place.",
    placeholder: "Enter a polynomial task, such as divide x^3 - 1 by x - 1",
    examples: [
      { label: "Multiply", expression: "(2x - 3)(x^2 + x + 4)" },
      { label: "Divide", expression: "divide x^3 - 1 by x - 1" },
      { label: "Find roots", expression: "solve x^3 - 6x^2 + 11x - 6 = 0" },
    ],
    overview: {
      heading: "One tool for common polynomial work",
      paragraphs: [
        "A polynomial is built from terms with nonnegative integer exponents. Its degree, leading coefficient, zeros, and end behavior all come from the same algebraic structure.",
        "Enter the operation in plain language when the expression alone could be ambiguous. For division, name the dividend and divisor. For roots, include an equals sign or ask the calculator to solve.",
      ],
    },
    formula: {
      title: "Remainder theorem",
      latex: "P(x)=(x-c)Q(x)+P(c)",
      explanation:
        "When P(x) is divided by x - c, the remainder is P(c). If P(c) = 0, then x - c is a factor.",
    },
    methods: [
      {
        title: "Line up like powers",
        description:
          "For addition, subtraction, and long division, keep terms ordered by degree and include zero placeholders.",
      },
      {
        title: "Use structure before expanding",
        description:
          "Factored form and special products can save work and reveal roots immediately.",
      },
      {
        title: "Verify with substitution",
        description:
          "Test suspected roots with P(c) and check division by multiplying the quotient back.",
      },
    ],
    workedExample: {
      problem: "Divide x³ - 1 by x - 1",
      steps: [
        { latex: "x^3+0x^2+0x-1", note: "Include missing powers before division." },
        { latex: "x^2(x-1)=x^3-x^2", note: "Match the leading term." },
        { latex: "x(x-1)=x^2-x", note: "Repeat with the new leading term." },
        { latex: "1(x-1)=x-1", note: "Finish with zero remainder." },
      ],
      answer: "The quotient is x² + x + 1, with remainder 0.",
    },
    mistakes: [
      {
        title: "Dropping missing degree terms",
        description:
          "Use zero coefficients so polynomial division columns stay aligned.",
      },
      {
        title: "Combining different powers",
        description:
          "Only terms with identical variable exponents are like terms.",
      },
      {
        title: "Assuming every root is rational",
        description:
          "The rational root theorem gives candidates, not a guarantee that a rational root exists.",
      },
    ],
    faqs: [
      {
        question: "What polynomial operations can the calculator perform?",
        answer:
          "It can add, subtract, multiply, divide, expand, factor, evaluate, and solve many polynomial equations.",
      },
      {
        question: "Can it use synthetic division?",
        answer:
          "Yes. Synthetic division is available when dividing by a linear factor in the form x - c.",
      },
      {
        question: "Can it find complex polynomial roots?",
        answer:
          "Yes. When exact factoring is not practical, the solution may include exact complex forms or numerical approximations.",
      },
      {
        question: "How do I ask for the degree of a polynomial?",
        answer:
          "Enter the expression and ask “find the degree and leading coefficient.”",
      },
    ],
    related: ["factoring", "quadratic-equation", "rational-expressions", "simplify"],
  },
  {
    slug: "rational-expressions",
    name: "Rational Expression Calculator",
    category: "Precalculus",
    seoTitle: "Rational Expression Calculator with Steps",
    description:
      "Simplify, add, multiply, divide, and solve rational expressions. See factoring, common denominators, restrictions, and excluded values.",
    keywords: [
      "rational expression calculator",
      "simplify rational expressions calculator",
      "rational equation solver",
      "algebraic fractions calculator",
    ],
    heading: "Rational Expression Calculator",
    heroDescription:
      "Simplify algebraic fractions and keep the original domain restrictions with the answer.",
    placeholder: "Enter a rational expression, such as (x^2 - 9)/(x^2 - x - 6)",
    examples: [
      { label: "Simplify", expression: "(x^2 - 9)/(x^2 - x - 6)" },
      { label: "Add fractions", expression: "2/x + 3/(x + 1)" },
      { label: "Solve an equation", expression: "1/x + 1/(x + 2) = 3/4" },
    ],
    overview: {
      heading: "Factor first, then reduce",
      paragraphs: [
        "A rational expression is a quotient of polynomials. Simplifying it means canceling common factors, not canceling separate terms across addition or subtraction.",
        "Values that make an original denominator zero stay excluded even if their factor later cancels. For addition and subtraction, build the least common denominator before combining numerators.",
      ],
    },
    formula: {
      title: "Cancel common factors",
      latex: "\\frac{ab}{ac}=\\frac{b}{c}\\quad (a\\ne0)",
      explanation:
        "Only a factor of the entire numerator and denominator can cancel, and its zero restriction remains.",
    },
    methods: [
      {
        title: "Record excluded values",
        description:
          "Set every original denominator equal to zero before simplifying.",
      },
      {
        title: "Factor the polynomials",
        description:
          "Common factors become visible only after numerators and denominators are factored.",
      },
      {
        title: "Use the least common denominator",
        description:
          "For sums and differences, rewrite each fraction with a shared denominator before combining.",
      },
    ],
    workedExample: {
      problem: "Simplify (x² - 9) / (x² - x - 6)",
      steps: [
        { latex: "x^2-9=(x-3)(x+3)", note: "Factor the difference of squares." },
        { latex: "x^2-x-6=(x-3)(x+2)", note: "Factor the denominator." },
        { latex: "\\frac{(x-3)(x+3)}{(x-3)(x+2)}=\\frac{x+3}{x+2}", note: "Cancel the common factor." },
      ],
      answer: "The simplified form is (x + 3)/(x + 2), with x ≠ 3 and x ≠ -2.",
    },
    mistakes: [
      {
        title: "Canceling across addition",
        description:
          "In (x + 3)/x, the x is not a factor of the entire numerator.",
      },
      {
        title: "Forgetting an excluded value",
        description:
          "A canceled denominator factor still marks a hole in the original expression.",
      },
      {
        title: "Adding denominators",
        description:
          "Fractions must share a denominator before their numerators can be combined.",
      },
    ],
    faqs: [
      {
        question: "Does the calculator list excluded values?",
        answer:
          "Yes. It checks the original denominators and keeps those restrictions even after factors cancel.",
      },
      {
        question: "Can it solve rational equations?",
        answer:
          "Yes. It can clear denominators, solve the resulting equation, and reject answers outside the original domain.",
      },
      {
        question: "Can it add rational expressions with different denominators?",
        answer:
          "Yes. It factors the denominators, builds a least common denominator, and combines the adjusted numerators.",
      },
      {
        question: "Why can a canceled factor still matter?",
        answer:
          "Canceling creates an equivalent expression only where the canceled factor is nonzero. The original zero remains excluded.",
      },
    ],
    related: ["factoring", "simplify", "polynomial", "inequalities"],
  },
  {
    slug: "complete-the-square",
    name: "Complete the Square Calculator",
    category: "Algebra",
    seoTitle: "Complete the Square Calculator with Steps",
    description:
      "Complete the square for quadratic expressions and equations. Convert to vertex form, solve for roots, and see each balancing step.",
    keywords: [
      "complete the square calculator",
      "completing the square calculator",
      "vertex form calculator",
      "complete square with steps",
    ],
    heading: "Complete the Square Calculator",
    heroDescription:
      "Turn a quadratic into a perfect square and use it to find vertex form or roots.",
    placeholder: "Enter a quadratic, such as x^2 + 6x - 7 = 0",
    examples: [
      { label: "Leading coefficient 1", expression: "complete the square: x^2 + 6x - 7 = 0" },
      { label: "Convert to vertex form", expression: "write y = x^2 - 8x + 3 in vertex form" },
      { label: "Leading coefficient 2", expression: "complete the square: 2x^2 + 12x + 5" },
    ],
    overview: {
      heading: "Build a perfect square trinomial",
      paragraphs: [
        "Completing the square rewrites a quadratic so part of it becomes (x + p)². That form makes the vertex visible and gives a direct route to solving by square roots.",
        "When the leading coefficient is not 1, factor it from the x² and x terms first. For equations, add the same value to both sides to keep the balance.",
      ],
    },
    formula: {
      title: "The completing term",
      latex: "x^2+bx+\\left(\\frac{b}{2}\\right)^2=\\left(x+\\frac{b}{2}\\right)^2",
      explanation:
        "Take half the x coefficient and square it to create a perfect square trinomial.",
    },
    methods: [
      {
        title: "Normalize the leading coefficient",
        description:
          "Factor or divide so the coefficient of x² inside the working group is 1.",
      },
      {
        title: "Add the completing term",
        description:
          "Take half the x coefficient, square it, and keep an equation balanced.",
      },
      {
        title: "Write the square",
        description:
          "Replace the trinomial with its binomial square, then solve or read the vertex.",
      },
    ],
    workedExample: {
      problem: "Solve x² + 6x - 7 = 0 by completing the square",
      steps: [
        { latex: "x^2+6x=7", note: "Move the constant to the other side." },
        { latex: "x^2+6x+9=16", note: "Add (6/2)² = 9 to both sides." },
        { latex: "(x+3)^2=16", note: "Rewrite the perfect square trinomial." },
        { latex: "x+3=\\pm4", note: "Take both square roots." },
        { latex: "x=1\\quad\\text{or}\\quad x=-7", note: "Isolate x in both cases." },
      ],
      answer: "The roots are x = 1 and x = -7.",
    },
    mistakes: [
      {
        title: "Using b² instead of (b/2)²",
        description:
          "The completing term is the square of half the x coefficient.",
      },
      {
        title: "Ignoring the leading coefficient",
        description:
          "The shortcut assumes the coefficient of x² is 1 inside the group.",
      },
      {
        title: "Taking only the positive square root",
        description:
          "Solving a squared equation requires both positive and negative roots.",
      },
    ],
    faqs: [
      {
        question: "Can the calculator convert a quadratic to vertex form?",
        answer:
          "Yes. Completing the square rewrites y = ax² + bx + c as y = a(x - h)² + k.",
      },
      {
        question: "Does it work when the leading coefficient is not 1?",
        answer:
          "Yes. The coefficient is factored from the variable terms before the completing term is added.",
      },
      {
        question: "Why complete the square instead of factoring?",
        answer:
          "It works when integer factoring is difficult and also reveals the vertex of the parabola.",
      },
      {
        question: "How is completing the square related to the quadratic formula?",
        answer:
          "The quadratic formula can be derived by completing the square on the general equation ax² + bx + c = 0.",
      },
    ],
    related: ["quadratic-equation", "factoring", "polynomial", "solve-for-x"],
  },
  {
    slug: "slope",
    name: "Slope Calculator",
    category: "Algebra",
    seoTitle: "Slope Calculator from Two Points with Steps",
    description:
      "Find slope from two points or a linear equation. See the substitution, sign work, line form, and special cases for horizontal or vertical lines.",
    keywords: [
      "slope calculator",
      "slope from two points calculator",
      "find slope calculator",
      "slope equation calculator",
    ],
    heading: "Slope Calculator",
    heroDescription:
      "Find rise over run from two points or read the slope from a line equation.",
    placeholder: "Enter two points, such as (2, 3) and (7, 13)",
    examples: [
      { label: "Two points", expression: "find the slope through (2, 3) and (7, 13)" },
      { label: "From standard form", expression: "find the slope of 3x - 2y = 8" },
      { label: "Vertical line", expression: "find the slope through (-4, 1) and (-4, 9)" },
    ],
    overview: {
      heading: "Slope measures how a line changes",
      paragraphs: [
        "Slope compares vertical change with horizontal change. A positive slope rises from left to right, a negative slope falls, and zero slope gives a horizontal line.",
        "The order of the points does not matter as long as the same order is used in both differences. A vertical line has zero horizontal change, so its slope is undefined.",
      ],
    },
    formula: {
      title: "Slope between two points",
      latex: "m=\\frac{y_2-y_1}{x_2-x_1}",
      explanation:
        "Subtract the y-coordinates and x-coordinates in matching order.",
    },
    methods: [
      {
        title: "Label the coordinates",
        description:
          "Assign one ordered pair as point 1 and the other as point 2.",
      },
      {
        title: "Compute rise and run",
        description:
          "Subtract y-values for the rise and x-values in the same order for the run.",
      },
      {
        title: "Reduce and interpret",
        description:
          "Simplify the fraction and check whether the line rises, falls, is horizontal, or is vertical.",
      },
    ],
    workedExample: {
      problem: "Find the slope through (2, 3) and (7, 13)",
      steps: [
        { latex: "m=\\frac{13-3}{7-2}", note: "Substitute the coordinates in matching order." },
        { latex: "m=\\frac{10}{5}", note: "Compute rise and run." },
        { latex: "m=2", note: "Reduce the fraction." },
      ],
      answer: "The line rises 2 units for every 1 unit moved to the right.",
    },
    mistakes: [
      {
        title: "Mixing subtraction order",
        description:
          "If y₂ - y₁ is used on top, use x₂ - x₁ on the bottom.",
      },
      {
        title: "Calling a vertical slope zero",
        description:
          "Vertical lines have undefined slope. Horizontal lines have slope zero.",
      },
      {
        title: "Reading standard form too quickly",
        description:
          "Rewrite Ax + By = C as y = mx + b before reading the slope.",
      },
    ],
    faqs: [
      {
        question: "Can the calculator find slope from an equation?",
        answer:
          "Yes. Enter slope-intercept, point-slope, or standard form and it will isolate y when needed.",
      },
      {
        question: "What is the slope of a vertical line?",
        answer:
          "It is undefined because the horizontal change is zero, which would require division by zero.",
      },
      {
        question: "What is the slope of a horizontal line?",
        answer:
          "It is zero because the y-coordinate does not change.",
      },
      {
        question: "Can it also find the equation of the line?",
        answer:
          "Yes. Ask for the line equation after entering two points, or provide one point and a slope.",
      },
    ],
    related: ["distance-formula", "systems-of-equations", "solve-for-x", "inequalities"],
  },
  {
    slug: "distance-formula",
    name: "Distance Formula Calculator",
    category: "Algebra",
    seoTitle: "Distance Formula Calculator for Two Points",
    description:
      "Find the distance between two points in 2D or 3D. See coordinate differences, squares, radical simplification, and decimal distance.",
    keywords: [
      "distance formula calculator",
      "distance between two points calculator",
      "coordinate distance calculator",
      "2d distance calculator",
    ],
    heading: "Distance Formula Calculator",
    heroDescription:
      "Enter two points to get the exact distance, decimal value, and substitution steps.",
    placeholder: "Enter two points, such as (-2, 4) and (5, -1)",
    examples: [
      { label: "Two dimensions", expression: "distance between (-2, 4) and (5, -1)" },
      { label: "Simple radical", expression: "distance between (1, 2) and (4, 6)" },
      { label: "Three dimensions", expression: "distance between (1, -2, 3) and (4, 2, -1)" },
    ],
    overview: {
      heading: "The distance formula comes from the Pythagorean theorem",
      paragraphs: [
        "The horizontal and vertical coordinate changes form the legs of a right triangle. The straight-line distance between the points is its hypotenuse.",
        "Subtracting in either order gives the same distance because each difference is squared. Exact answers are often left as simplified radicals, with a decimal approximation added when useful.",
      ],
    },
    formula: {
      title: "Distance in the coordinate plane",
      latex: "d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}",
      explanation:
        "Square the coordinate changes, add them, and take the nonnegative square root.",
    },
    methods: [
      {
        title: "Find coordinate changes",
        description:
          "Subtract the x-coordinates and y-coordinates in consistent pairs.",
      },
      {
        title: "Square and add",
        description:
          "Squaring makes both contributions nonnegative before they are combined.",
      },
      {
        title: "Simplify the root",
        description:
          "Factor out any perfect square and add a decimal only if the problem asks for one.",
      },
    ],
    workedExample: {
      problem: "Find the distance between (-2, 4) and (5, -1)",
      steps: [
        { latex: "d=\\sqrt{(5-(-2))^2+(-1-4)^2}", note: "Substitute both ordered pairs." },
        { latex: "d=\\sqrt{7^2+(-5)^2}", note: "Compute the coordinate changes." },
        { latex: "d=\\sqrt{49+25}=\\sqrt{74}", note: "Square and add." },
      ],
      answer: "The exact distance is √74, which is about 8.60 units.",
    },
    mistakes: [
      {
        title: "Forgetting parentheses around negatives",
        description:
          "Write 5 - (-2) before simplifying so the sign change is clear.",
      },
      {
        title: "Adding before squaring",
        description:
          "Each coordinate difference is squared separately.",
      },
      {
        title: "Rounding too early",
        description:
          "Keep the radical exact until the last line, then round once.",
      },
    ],
    faqs: [
      {
        question: "Can the calculator find 3D distance?",
        answer:
          "Yes. Enter points as (x, y, z). The formula adds the square of the z-coordinate difference.",
      },
      {
        question: "Does the order of the two points matter?",
        answer:
          "No. Reversing both coordinate subtractions changes their signs, but squaring produces the same distance.",
      },
      {
        question: "Will it simplify radical answers?",
        answer:
          "Yes. It gives an exact simplified radical when possible and can also provide a decimal approximation.",
      },
      {
        question: "Is distance ever negative?",
        answer:
          "No. Geometric distance is always nonnegative because it is defined using squared changes and the principal square root.",
      },
    ],
    related: ["slope", "solve-for-x", "systems-of-equations", "quadratic-equation"],
  },
] satisfies CalculatorDefinition[];

export const calculatorDefinitions = [
  ...algebraPrecalculusCalculators,
  ...calculusCalculators,
  ...linearAlgebraCalculators,
  ...trigonometryCalculators,
  ...statisticsCalculators,
  ...generalPrecalculusCalculators,
  ...graphingCalculators,
] satisfies CalculatorDefinition[];

export type CalculatorSlug = (typeof calculatorDefinitions)[number]["slug"];

export function validateCalculatorDefinitions(
  definitions: readonly CalculatorDefinition[] = calculatorDefinitions,
) {
  const slugs = new Set<string>();
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const headings = new Set<string>();
  const knownSlugs = new Set(definitions.map(({ slug }) => slug));
  const categoryCounts = new Map<CalculatorCategory, number>(
    calculatorCategories.map((category) => [category, 0]),
  );

  for (const calculator of definitions) {
    const duplicateChecks = [
      [slugs, calculator.slug, "slug"],
      [titles, calculator.seoTitle, "SEO title"],
      [descriptions, calculator.description, "description"],
      [headings, calculator.heading, "heading"],
    ] as const;

    for (const [seen, value, label] of duplicateChecks) {
      if (seen.has(value)) {
        throw new Error(`Duplicate calculator ${label}: ${value}`);
      }
      seen.add(value);
    }

    if (!calculatorCategories.includes(calculator.category)) {
      throw new Error(
        `Unknown category "${calculator.category}" on ${calculator.slug}`,
      );
    }
    categoryCounts.set(
      calculator.category,
      (categoryCounts.get(calculator.category) ?? 0) + 1,
    );
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(calculator.slug)) {
      throw new Error(`Invalid calculator slug: ${calculator.slug}`);
    }
    if (calculator.seoTitle.length < 20 || calculator.seoTitle.length > 65) {
      throw new Error(`SEO title length is invalid on ${calculator.slug}`);
    }
    if (
      calculator.description.length < 110 ||
      calculator.description.length > 180
    ) {
      throw new Error(`Meta description length is invalid on ${calculator.slug}`);
    }
    if (calculator.examples.length < 3) {
      throw new Error(`At least three examples are required on ${calculator.slug}`);
    }
    if (new Set(calculator.examples.map(({ expression }) => expression)).size !== calculator.examples.length) {
      throw new Error(`Duplicate example expression on ${calculator.slug}`);
    }
    if (calculator.examples[0].expression.length > 100) {
      throw new Error(`First example is too long for OG on ${calculator.slug}`);
    }
    if (calculator.methods.length < 3 || calculator.mistakes.length < 3) {
      throw new Error(`Method or mistake coverage is incomplete on ${calculator.slug}`);
    }
    if (
      calculator.keywords.length < 3 ||
      new Set(calculator.keywords).size !== calculator.keywords.length
    ) {
      throw new Error(`Keyword coverage is incomplete on ${calculator.slug}`);
    }
    if (
      calculator.overview.paragraphs.length < 2 ||
      calculator.workedExample.steps.length < 3
    ) {
      throw new Error(`Article coverage is incomplete on ${calculator.slug}`);
    }
    if (calculator.faqs.length < 4) {
      throw new Error(`At least four FAQs are required on ${calculator.slug}`);
    }
    if (
      (calculator.category === "Calculus" ||
        calculator.category === "Linear Algebra" ||
        calculator.category === "Trigonometry" ||
        calculator.category === "Statistics" ||
        calculator.category === "General Math" ||
        calculator.category === "Graphing") &&
      !calculator.solverInstruction
    ) {
      throw new Error(
        `${calculator.category} solver instruction is missing on ${calculator.slug}`,
      );
    }
    if (calculator.tool?.kind === "graphing") {
      if (
        calculator.category !== "Graphing" ||
        calculator.tool.initialExpressions.length < 1 ||
        calculator.tool.initialExpressions.length > 4
      ) {
        throw new Error(`Graphing tool configuration is invalid on ${calculator.slug}`);
      }
    } else if (calculator.category === "Graphing") {
      throw new Error(`Graphing tool is missing on ${calculator.slug}`);
    }
    if (JSON.stringify(calculator).includes("\u2014")) {
      throw new Error(`Em dash found in calculator content on ${calculator.slug}`);
    }
    if (new Set(calculator.related).size !== calculator.related.length) {
      throw new Error(`Duplicate related calculator on ${calculator.slug}`);
    }
    for (const relatedSlug of calculator.related) {
      if (relatedSlug === calculator.slug) {
        throw new Error(`Calculator links to itself: ${calculator.slug}`);
      }
      if (!knownSlugs.has(relatedSlug)) {
        throw new Error(
          `Unknown related calculator "${relatedSlug}" on ${calculator.slug}`,
        );
      }
    }
  }

  for (const [category, count] of categoryCounts) {
    if (count === 0) {
      throw new Error(`Calculator category is empty: ${category}`);
    }
  }
}

validateCalculatorDefinitions();

export const calculatorsBySlug: Map<string, CalculatorDefinition> = new Map(
  calculatorDefinitions.map((calculator) => [calculator.slug, calculator]),
);

export function getCalculator(slug: string) {
  return calculatorsBySlug.get(slug);
}

export function getRelatedCalculators(calculator: CalculatorDefinition) {
  return calculator.related
    .map((slug) => getCalculator(slug))
    .filter((item): item is CalculatorDefinition => Boolean(item));
}
