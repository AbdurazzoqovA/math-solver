import type { CalculatorDefinition } from "./calculators";

export const calculusCalculators = [
  {
    slug: "derivative",
    name: "Derivative Calculator",
    category: "Calculus",
    seoTitle: "Derivative Calculator with Steps",
    description:
      "Differentiate functions step by step with power, product, quotient, and chain rules. Find higher derivatives or evaluate a derivative at a point.",
    keywords: [
      "derivative calculator",
      "derivative calculator with steps",
      "differentiation calculator",
      "higher derivative calculator",
    ],
    heading: "Derivative Calculator",
    heroDescription:
      "Differentiate a function, identify each rule, and simplify the result one step at a time.",
    placeholder:
      "Enter a derivative, such as d/dx [x^2 e^x]",
    solverInstruction:
      "Differentiate the expression with respect to the stated variable. If no variable is stated and the expression uses x, differentiate with respect to x. Show the differentiation rule used at each step, preserve domain restrictions, and evaluate at a point only when the user supplies one.",
    examples: [
      {
        label: "Product rule",
        expression: "differentiate x^2 e^x with respect to x",
      },
      {
        label: "Chain rule",
        expression: "find d/dx of sin(x^2)",
      },
      {
        label: "Second derivative",
        expression: "find the second derivative of x^3 e^x",
      },
    ],
    overview: {
      heading: "Read the structure before differentiating",
      paragraphs: [
        "A derivative measures instantaneous change. For a smooth graph, it is the slope of the tangent line. The calculation depends on how the function is built, so a product, quotient, or composition needs more than the power rule.",
        "Enter the function and say which variable to use. You can also request a second or higher derivative, or ask for the derivative at a particular point. The result keeps the rule names beside the algebra so you can see why each term appears.",
      ],
    },
    formula: {
      title: "The chain rule",
      latex:
        "\\frac{d}{dx}f(g(x))=f'(g(x))g'(x)",
      explanation:
        "Differentiate the outside function, keep the inside expression in place, then multiply by the derivative of the inside.",
    },
    methods: [
      {
        title: "Identify the outer operation",
        description:
          "Decide whether the function is a sum, product, quotient, or composition before applying a rule.",
      },
      {
        title: "Differentiate each layer",
        description:
          "Use the power, product, quotient, and chain rules in the order set by the function's structure.",
      },
      {
        title: "Simplify and check the domain",
        description:
          "Factor or combine terms when helpful, but keep restrictions from roots, logarithms, and denominators.",
      },
    ],
    workedExample: {
      problem: "Find the derivative of x²eˣ",
      steps: [
        {
          latex: "u=x^2,\\quad v=e^x",
          note: "Treat the expression as a product of two functions.",
        },
        {
          latex: "u'=2x,\\quad v'=e^x",
          note: "Differentiate each factor.",
        },
        {
          latex: "(uv)'=u'v+uv'",
          note: "Apply the product rule.",
        },
        {
          latex: "\\frac{d}{dx}(x^2e^x)=e^x(x^2+2x)",
          note: "Factor out the common exponential term.",
        },
      ],
      answer: "The derivative is eˣ(x² + 2x). Expanding it to x²eˣ + 2xeˣ gives the same function.",
    },
    mistakes: [
      {
        title: "Multiplying the derivatives",
        description:
          "The derivative of a product is u′v + uv′, not u′v′.",
      },
      {
        title: "Dropping the inner derivative",
        description:
          "A chain-rule result must include the derivative of the inside function.",
      },
      {
        title: "Substituting a point too early",
        description:
          "Find the derivative function first, then evaluate it at the requested point.",
      },
    ],
    faqs: [
      {
        question: "What does a derivative measure?",
        answer:
          "It gives an instantaneous rate of change and, where the graph is smooth, the slope of the tangent line.",
      },
      {
        question: "Can this calculator find higher derivatives?",
        answer:
          "Yes. State the derivative order, such as second derivative or third derivative, in the problem.",
      },
      {
        question: "How do I find a derivative at a point?",
        answer:
          "Differentiate first, then substitute the point into the derivative if that derivative exists there.",
      },
      {
        question: "Why can two derivative answers look different?",
        answer:
          "Factored and expanded expressions can be equivalent. Simplify both forms or expand them before comparing.",
      },
    ],
    related: [
      "limit",
      "integral",
      "partial-derivative",
      "implicit-differentiation",
    ],
  },
  {
    slug: "integral",
    name: "Integral Calculator",
    category: "Calculus",
    seoTitle: "Integral Calculator with Steps",
    description:
      "Find indefinite integrals and antiderivatives with step-by-step work. See the integration rule, simplify the result, and check by differentiating.",
    keywords: [
      "integral calculator",
      "integral calculator with steps",
      "integration calculator",
      "antiderivative calculator",
    ],
    heading: "Integral Calculator",
    heroDescription:
      "Find an indefinite integral, follow the chosen method, and keep the constant of integration.",
    placeholder:
      "Enter an indefinite integral, such as integrate x e^(x^2) dx",
    solverInstruction:
      "Find the indefinite integral with respect to the stated variable. Include the constant of integration, explain the selected method, preserve real-domain restrictions such as ln absolute values, and check the antiderivative by differentiating when useful.",
    examples: [
      {
        label: "Substitution",
        expression: "integrate x e^(x^2) dx",
      },
      {
        label: "Integration by parts",
        expression: "find the indefinite integral of x cos(x) dx",
      },
      {
        label: "Rational form",
        expression: "integrate 1/(x^2 + 1) dx",
      },
    ],
    overview: {
      heading: "An integral is a family of antiderivatives",
      paragraphs: [
        "An indefinite integral asks for every function whose derivative equals the integrand. Those functions differ by a constant, which is why a complete answer ends with + C.",
        "The right method depends on the integrand. A disguised chain rule suggests substitution, a product may call for integration by parts, and a rational expression may need algebra or partial fractions before any integration rule is useful.",
      ],
    },
    formula: {
      title: "The substitution pattern",
      latex:
        "\\int f(g(x))g'(x)\\,dx=F(g(x))+C",
      explanation:
        "When part of the integrand is an inner function and another part is its derivative, substitution can turn the problem into a standard form.",
    },
    methods: [
      {
        title: "Match a standard form",
        description:
          "Check first for the power, logarithm, exponential, and trigonometric antiderivative rules.",
      },
      {
        title: "Choose a transformation",
        description:
          "Use substitution, integration by parts, identities, or partial fractions only when the structure supports it.",
      },
      {
        title: "Differentiate the result",
        description:
          "A quick derivative should simplify back to the original integrand on the stated domain.",
      },
    ],
    workedExample: {
      problem: "Evaluate ∫x e^(x²) dx",
      steps: [
        {
          latex: "u=x^2,\\quad du=2x\\,dx",
          note: "Choose the exponent as the substitution.",
        },
        {
          latex: "x\\,dx=\\frac{1}{2}du",
          note: "Solve for the remaining differential factor.",
        },
        {
          latex: "\\int xe^{x^2}\\,dx=\\frac{1}{2}\\int e^u\\,du",
          note: "Rewrite the integral in terms of u.",
        },
        {
          latex: "\\frac{1}{2}e^{x^2}+C",
          note: "Integrate and substitute x² back for u.",
        },
      ],
      answer: "The antiderivative is ½e^(x²) + C. Differentiating it returns xe^(x²).",
    },
    mistakes: [
      {
        title: "Leaving off the constant",
        description:
          "An indefinite integral represents a family of antiderivatives, so the final answer needs + C.",
      },
      {
        title: "Using the power rule on 1/x",
        description:
          "The exponent -1 is the exception. Its real antiderivative is ln|x| + C.",
      },
      {
        title: "Forcing an elementary answer",
        description:
          "Some integrals require special functions or have no elementary antiderivative.",
      },
    ],
    faqs: [
      {
        question: "Why does an indefinite integral need + C?",
        answer:
          "Differentiation removes constants, so every antiderivative belongs to a family whose members differ by a constant.",
      },
      {
        question: "How can I check an antiderivative?",
        answer:
          "Differentiate it. The result should simplify to the original integrand wherever both expressions are defined.",
      },
      {
        question: "How is this different from a definite integral?",
        answer:
          "An indefinite integral returns a family of functions. A definite integral uses bounds and returns a value.",
      },
      {
        question: "What if no elementary antiderivative exists?",
        answer:
          "A correct result may use a named special function or leave the integral unevaluated instead of inventing an elementary form.",
      },
    ],
    related: ["definite-integral", "derivative", "taylor-series", "limit"],
  },
  {
    slug: "definite-integral",
    name: "Definite Integral Calculator",
    category: "Calculus",
    seoTitle: "Definite Integral Calculator with Steps",
    description:
      "Evaluate definite integrals between two bounds with clear steps. See endpoint substitution, the exact signed value, and a decimal result when useful.",
    keywords: [
      "definite integral calculator",
      "definite integral calculator with steps",
      "evaluate definite integral",
      "integral with bounds calculator",
    ],
    heading: "Definite Integral Calculator",
    heroDescription:
      "Evaluate an integral between two bounds and separate signed accumulation from geometric area.",
    placeholder:
      "Enter an integral with bounds, such as integrate x from -1 to 2",
    solverInstruction:
      "Evaluate the definite integral using the supplied lower and upper bounds. Give an exact value first, explain endpoint substitution or the relevant method, distinguish signed accumulation from total geometric area, and do not add a constant of integration.",
    examples: [
      {
        label: "Polynomial",
        expression: "evaluate the integral of x from -1 to 2",
      },
      {
        label: "Trigonometric",
        expression: "evaluate integral from 0 to pi of sin(x) dx",
      },
      {
        label: "Logarithmic value",
        expression: "evaluate integral from 1 to 2 of 1/x dx",
      },
    ],
    overview: {
      heading: "Bounds turn an antiderivative into a value",
      paragraphs: [
        "A definite integral measures signed accumulation across an interval. Contributions above the horizontal axis are positive and contributions below it are negative, so the result is not always the total geometric area.",
        "When the integrand is continuous and an antiderivative is available, the Fundamental Theorem of Calculus reduces the problem to F(b) - F(a). Discontinuities and infinite bounds require an improper-integral limit instead of direct substitution.",
      ],
    },
    formula: {
      title: "The Fundamental Theorem of Calculus",
      latex:
        "\\int_a^b f(x)\\,dx=F(b)-F(a),\\quad F'(x)=f(x)",
      explanation:
        "Find an antiderivative, evaluate it at the upper bound, then subtract its value at the lower bound.",
    },
    methods: [
      {
        title: "Check the interval",
        description:
          "Look for discontinuities, infinite bounds, or sign changes before applying an antiderivative mechanically.",
      },
      {
        title: "Evaluate upper minus lower",
        description:
          "Use F(b) - F(a), keeping exact values until the final simplification.",
      },
      {
        title: "Interpret the sign",
        description:
          "State whether the result is signed accumulation or whether the problem instead asks for total geometric area.",
      },
    ],
    workedExample: {
      problem: "Evaluate ∫ from -1 to 2 of x dx",
      steps: [
        {
          latex: "F(x)=\\frac{x^2}{2}",
          note: "Find an antiderivative of x.",
        },
        {
          latex: "F(2)-F(-1)=\\frac{2^2}{2}-\\frac{(-1)^2}{2}",
          note: "Substitute the upper bound, then the lower bound.",
        },
        {
          latex: "2-\\frac{1}{2}=\\frac{3}{2}",
          note: "Simplify the signed value.",
        },
      ],
      answer: "The definite integral is 3/2. The total geometric area is 5/2 because the part below the axis must be counted positively for area.",
    },
    mistakes: [
      {
        title: "Reversing the subtraction",
        description:
          "The Fundamental Theorem uses F(upper) - F(lower). Reversing that order changes the sign.",
      },
      {
        title: "Calling every result area",
        description:
          "A definite integral is signed. Total area requires splitting where the function changes sign.",
      },
      {
        title: "Ignoring an interior singularity",
        description:
          "A vertical asymptote inside the interval can make the integral improper or divergent.",
      },
    ],
    faqs: [
      {
        question: "Is a definite integral always area?",
        answer:
          "It is signed accumulation. Total geometric area requires splitting at sign changes and integrating absolute value.",
      },
      {
        question: "What happens when the upper bound is smaller?",
        answer:
          "Reversing the bounds reverses the sign of the definite integral.",
      },
      {
        question: "Why is there no + C in the answer?",
        answer:
          "Any antiderivative constant cancels in F(b) - F(a), so the final definite value has no + C.",
      },
      {
        question: "Can a bound be infinity?",
        answer:
          "Yes, but that creates an improper integral that must be defined and tested through a limit.",
      },
    ],
    related: ["integral", "derivative", "limit", "series-convergence"],
  },
  {
    slug: "limit",
    name: "Limit Calculator",
    category: "Calculus",
    seoTitle: "Limit Calculator with Steps",
    description:
      "Evaluate two-sided, one-sided, and infinite limits with clear steps. Detect removable holes, jumps, divergence, and limits that do not exist.",
    keywords: [
      "limit calculator",
      "limit calculator with steps",
      "one sided limit calculator",
      "limit at infinity calculator",
    ],
    heading: "Limit Calculator",
    heroDescription:
      "Study what a function approaches from the left, right, or at infinity, even when direct substitution fails.",
    placeholder:
      "Enter a limit, such as limit (x^2 - 4)/(x - 2) as x approaches 2",
    solverInstruction:
      "Evaluate the stated function limit. Respect any left-hand, right-hand, or infinite direction, show why the chosen method applies, compare one-sided limits when needed, and clearly distinguish a finite result, unbounded behavior, and a limit that does not exist.",
    examples: [
      {
        label: "Removable hole",
        expression: "limit (x^2 - 4)/(x - 2) as x approaches 2",
      },
      {
        label: "Standard trig limit",
        expression: "limit sin(x)/x as x approaches 0",
      },
      {
        label: "Limit at infinity",
        expression: "limit (3x^2 + 1)/(x^2 - 4) as x approaches infinity",
      },
    ],
    overview: {
      heading: "A limit describes nearby behavior",
      paragraphs: [
        "A limit asks what a function approaches, not necessarily what the function equals at the target point. That is why a removable hole can have a limit even though the original expression is undefined there.",
        "Direct substitution is the first check, not always the last step. An indeterminate form may call for factoring, rationalization, a standard limit, dominant-term analysis, or L'Hopital's rule when its hypotheses are satisfied.",
      ],
    },
    formula: {
      title: "Agreement of one-sided limits",
      latex:
        "\\lim_{x\\to a}f(x)=L\\iff\\lim_{x\\to a^-}f(x)=\\lim_{x\\to a^+}f(x)=L",
      explanation:
        "A two-sided limit exists only when the values approached from the left and right agree.",
    },
    methods: [
      {
        title: "Try direct substitution",
        description:
          "If it produces a defined value and the function is continuous there, the limit is immediate.",
      },
      {
        title: "Resolve the indeterminate form",
        description:
          "Factor, rationalize, use a standard limit, or apply a justified theorem instead of treating 0/0 as an answer.",
      },
      {
        title: "Check direction and domain",
        description:
          "Compare left and right behavior for jumps, roots, logarithms, absolute values, and piecewise functions.",
      },
    ],
    workedExample: {
      problem: "Find lim as x approaches 2 of (x² - 4)/(x - 2)",
      steps: [
        {
          latex: "\\frac{2^2-4}{2-2}=\\frac{0}{0}",
          note: "Direct substitution gives an indeterminate form.",
        },
        {
          latex: "x^2-4=(x-2)(x+2)",
          note: "Factor the difference of squares.",
        },
        {
          latex: "\\frac{(x-2)(x+2)}{x-2}=x+2\\quad(x\\ne2)",
          note: "Cancel only for nearby values where x is not 2.",
        },
        {
          latex: "\\lim_{x\\to2}(x+2)=4",
          note: "Now substitute into the simplified expression.",
        },
      ],
      answer: "The limit is 4 even though the original expression is undefined at x = 2.",
    },
    mistakes: [
      {
        title: "Stopping at 0/0",
        description:
          "The form 0/0 signals that more work is needed. It is not the value of the limit.",
      },
      {
        title: "Ignoring one-sided behavior",
        description:
          "A two-sided limit fails when the left-hand and right-hand limits disagree.",
      },
      {
        title: "Using L'Hopital's rule automatically",
        description:
          "The rule applies only to justified 0/0 or infinity/infinity forms under the required conditions.",
      },
    ],
    faqs: [
      {
        question: "Can a limit exist when the function is undefined?",
        answer:
          "Yes. A limit describes nearby behavior, so the value at the target can be missing or different.",
      },
      {
        question: "When does a two-sided limit exist?",
        answer:
          "The left-hand and right-hand limits must approach the same value.",
      },
      {
        question: "What does DNE mean?",
        answer:
          "It means the limit does not exist as one value, often because of a jump, oscillation, or incompatible one-sided behavior.",
      },
      {
        question: "When can I use L'Hopital's rule?",
        answer:
          "Use it only after confirming a 0/0 or infinity/infinity indeterminate form and the needed differentiability conditions.",
      },
    ],
    related: ["derivative", "definite-integral", "taylor-series", "series-convergence"],
  },
  {
    slug: "partial-derivative",
    name: "Partial Derivative Calculator",
    category: "Calculus",
    seoTitle: "Partial Derivative Calculator with Steps",
    description:
      "Find partial and mixed derivatives of multivariable functions. Choose the variable and order, then see each differentiation rule applied.",
    keywords: [
      "partial derivative calculator",
      "partial derivative calculator with steps",
      "multivariable derivative calculator",
      "mixed partial derivative calculator",
    ],
    heading: "Partial Derivative Calculator",
    heroDescription:
      "Differentiate a multivariable function with respect to one variable while holding the others fixed.",
    placeholder:
      "Enter a partial derivative, such as partial d/dx of x^2 y + sin(xy)",
    solverInstruction:
      "Find the requested partial derivative of the multivariable function. Differentiate with respect to the stated variable or variable sequence, hold the other independent variables constant, state the order for mixed partials, and preserve domain restrictions.",
    examples: [
      {
        label: "With respect to x",
        expression: "find partial d/dx of x^2 y + sin(xy)",
      },
      {
        label: "With respect to y",
        expression: "find partial d/dy of e^(xy)",
      },
      {
        label: "Mixed partial",
        expression: "find partial^2/(partial x partial y) of sin(x^2 y)",
      },
    ],
    overview: {
      heading: "Change one input and hold the others still",
      paragraphs: [
        "A partial derivative measures how a multivariable function changes when one independent variable moves and the others are treated as constants. The selected variable matters, so fₓ and fᵧ can describe different rates of change at the same point.",
        "Higher partials repeat the process. Mixed partials use more than one variable in a stated order, while the gradient collects all first partial derivatives into one vector. Those ideas are related, but they answer different questions.",
      ],
    },
    formula: {
      title: "Partial derivative with respect to x",
      latex:
        "\\frac{\\partial f}{\\partial x}=\\lim_{h\\to0}\\frac{f(x+h,y)-f(x,y)}{h}",
      explanation:
        "The definition changes x by a small amount while y and any other independent variables stay fixed.",
    },
    methods: [
      {
        title: "Name the differentiation variable",
        description:
          "Write whether you need fₓ, fᵧ, a higher partial, or a mixed variable sequence before starting.",
      },
      {
        title: "Hold other inputs constant",
        description:
          "Apply ordinary differentiation rules to the selected variable and treat the remaining independent variables as constants.",
      },
      {
        title: "Respect the order",
        description:
          "For mixed partials, differentiate in the written order and do not swap it unless the needed continuity conditions hold.",
      },
    ],
    workedExample: {
      problem: "Find ∂f/∂x for f(x,y) = x²y + sin(xy)",
      steps: [
        {
          latex: "\\frac{\\partial}{\\partial x}(x^2y)=2xy",
          note: "Treat y as a constant while differentiating x².",
        },
        {
          latex: "\\frac{\\partial}{\\partial x}\\sin(xy)=y\\cos(xy)",
          note: "Use the chain rule; the x derivative of xy is y.",
        },
        {
          latex: "f_x=2xy+y\\cos(xy)",
          note: "Add the two partial derivatives.",
        },
      ],
      answer: "The partial derivative with respect to x is 2xy + y cos(xy).",
    },
    mistakes: [
      {
        title: "Differentiating every variable",
        description:
          "Only the selected variable changes. Other independent variables act like constants in that partial derivative.",
      },
      {
        title: "Leaving the variable unstated",
        description:
          "A multivariable function can have several different first partial derivatives.",
      },
      {
        title: "Confusing partial and total change",
        description:
          "A partial derivative holds other inputs fixed; a total derivative along a path includes how those inputs change.",
      },
    ],
    faqs: [
      {
        question: "How is a partial derivative different from an ordinary derivative?",
        answer:
          "It changes one independent variable while holding the other independent variables fixed.",
      },
      {
        question: "What is a mixed partial derivative?",
        answer:
          "It differentiates in sequence with respect to different variables, such as first x and then y.",
      },
      {
        question: "What is the gradient?",
        answer:
          "The gradient is the vector of first partial derivatives. Where the function is differentiable, it points toward the steepest local increase.",
      },
      {
        question: "Do partial derivatives guarantee differentiability?",
        answer:
          "No. A function can have partial derivatives at a point and still fail to be differentiable there.",
      },
    ],
    related: ["derivative", "implicit-differentiation", "limit", "taylor-series"],
  },
  {
    slug: "implicit-differentiation",
    name: "Implicit Differentiation Calculator",
    category: "Calculus",
    seoTitle: "Implicit Differentiation Calculator with Steps",
    description:
      "Find dy/dx from an implicit equation with every chain and product rule shown. See how derivative terms are collected and solved.",
    keywords: [
      "implicit differentiation calculator",
      "implicit derivative calculator",
      "dy dx calculator",
      "implicit differentiation with steps",
    ],
    heading: "Implicit Differentiation Calculator",
    heroDescription:
      "Differentiate an equation where y is not isolated, collect the y′ terms, and solve for dy/dx.",
    placeholder:
      "Enter an implicit equation, such as x^2 + xy + y^2 = 7",
    solverInstruction:
      "Differentiate the implicit equation with respect to x, treating y as a function of x. Show chain-rule and product-rule factors involving dy/dx, collect the derivative terms, solve for dy/dx, and verify any requested point lies on the original curve.",
    examples: [
      {
        label: "Circle",
        expression: "find dy/dx implicitly for x^2 + y^2 = 25",
      },
      {
        label: "Product term",
        expression: "find dy/dx for x^2 + xy + y^2 = 7",
      },
      {
        label: "Trig relation",
        expression: "differentiate implicitly sin(x + y) = xy",
      },
    ],
    overview: {
      heading: "Differentiate the relation without isolating y",
      paragraphs: [
        "An implicit equation can describe a curve even when solving explicitly for y is awkward or splits the curve into several branches. Implicit differentiation works with the relation as written.",
        "Because y depends on x, every derivative of an expression involving y brings in dy/dx through the chain rule. After differentiating both sides, gather those derivative terms and solve the resulting equation for the slope.",
      ],
    },
    formula: {
      title: "Implicit derivative from F(x,y)",
      latex:
        "\\frac{dy}{dx}=-\\frac{F_x}{F_y},\\quad F_y\\ne0",
      explanation:
        "For a differentiable relation F(x,y) = 0, the partial derivatives give the local slope wherever Fᵧ is not zero.",
    },
    methods: [
      {
        title: "Differentiate both sides",
        description:
          "Treat y as y(x), using the chain rule for powers and functions of y and the product rule for terms such as xy.",
      },
      {
        title: "Collect every y′ term",
        description:
          "Move terms containing dy/dx to one side and factor out the common derivative.",
      },
      {
        title: "Check the requested point",
        description:
          "Confirm the point lies on the original curve before substituting coordinates into the slope formula.",
      },
    ],
    workedExample: {
      problem: "Find dy/dx for x² + xy + y² = 7",
      steps: [
        {
          latex: "2x+(xy'+y)+2yy'=0",
          note: "Differentiate both sides and use the product rule on xy.",
        },
        {
          latex: "xy'+2yy'=-(2x+y)",
          note: "Move the terms without y′ to the other side.",
        },
        {
          latex: "(x+2y)y'=-(2x+y)",
          note: "Factor out y′.",
        },
        {
          latex: "y'=-\\frac{2x+y}{x+2y}",
          note: "Divide by x + 2y where it is not zero.",
        },
      ],
      answer: "The implicit derivative is -(2x + y)/(x + 2y). A zero denominator may indicate a vertical tangent or a singular point.",
    },
    mistakes: [
      {
        title: "Treating y as a constant",
        description:
          "The equation makes y depend on x, so differentiating y contributes dy/dx.",
      },
      {
        title: "Missing the chain-rule factor",
        description:
          "The derivative of y² is 2y dy/dx, not only 2y.",
      },
      {
        title: "Skipping the point check",
        description:
          "A slope at a point is meaningful only if that point satisfies the original relation.",
      },
    ],
    faqs: [
      {
        question: "Why does y′ appear when differentiating y?",
        answer:
          "Since y depends on x, the chain rule contributes dy/dx whenever an expression involving y is differentiated.",
      },
      {
        question: "Could I solve for y first?",
        answer:
          "Sometimes, but that can create several branches or harder algebra. Implicit differentiation works directly with the curve.",
      },
      {
        question: "How do I find the slope at a point?",
        answer:
          "Verify the point satisfies the equation, find dy/dx, then substitute both coordinates.",
      },
      {
        question: "What can indicate a vertical tangent?",
        answer:
          "In -Fₓ/Fᵧ, a zero Fᵧ with nonzero Fₓ is a common vertical-tangent case. If both vanish, more analysis is needed.",
      },
    ],
    related: ["derivative", "partial-derivative", "limit", "slope"],
  },
  {
    slug: "taylor-series",
    name: "Taylor Series Calculator",
    category: "Calculus",
    seoTitle: "Taylor Series Calculator with Steps",
    description:
      "Build Taylor and Maclaurin series from a function, center, and degree. See derivative values, coefficients, the polynomial, and approximation steps.",
    keywords: [
      "taylor series calculator",
      "maclaurin series calculator",
      "taylor polynomial calculator",
      "taylor expansion calculator",
    ],
    heading: "Taylor Series Calculator",
    heroDescription:
      "Build a Taylor or Maclaurin polynomial from a function, expansion center, and chosen degree.",
    placeholder:
      "Enter a request, such as degree 3 Taylor polynomial for ln(x) centered at 1",
    solverInstruction:
      "Construct the requested Taylor or Maclaurin polynomial using the stated function, center, and degree. Show derivative values and factorial coefficients, keep powers centered at x minus a, distinguish a finite polynomial from an infinite series, and state approximation or convergence limits when relevant.",
    examples: [
      {
        label: "Maclaurin polynomial",
        expression: "find the degree 5 Maclaurin polynomial for sin(x)",
      },
      {
        label: "Nonzero center",
        expression: "find the degree 3 Taylor polynomial for ln(x) centered at 1",
      },
      {
        label: "Approximation",
        expression: "use degree 4 Taylor polynomial for e^x at 0 to approximate e^0.2",
      },
    ],
    overview: {
      heading: "Turn local derivative data into a polynomial",
      paragraphs: [
        "A Taylor polynomial matches a function and a chosen number of its derivatives at a center a. Near that center, the polynomial can be much easier to evaluate, differentiate, or integrate than the original function.",
        "A Maclaurin polynomial is simply the case a = 0. The degree controls how many terms are kept. More terms often improve a nearby approximation, but accuracy also depends on the function, the center, and how far the target lies from that center.",
      ],
    },
    formula: {
      title: "Taylor polynomial of degree n",
      latex:
        "T_n(x)=\\sum_{k=0}^{n}\\frac{f^{(k)}(a)}{k!}(x-a)^k",
      explanation:
        "Evaluate each derivative at the center, divide by the matching factorial, and multiply by the corresponding power of x - a.",
    },
    methods: [
      {
        title: "Record center and degree",
        description:
          "The center determines the powers of x - a, while the degree determines the last derivative and term needed.",
      },
      {
        title: "Build the coefficient table",
        description:
          "Evaluate f(a), f′(a), and successive derivatives at a, then divide each value by its factorial.",
      },
      {
        title: "State the approximation limits",
        description:
          "Keep the remainder or local nature of the polynomial clear, especially when evaluating far from the center.",
      },
    ],
    workedExample: {
      problem: "Find the degree-3 Taylor polynomial for ln(x) at a = 1",
      steps: [
        {
          latex: "f(1)=0,\\quad f'(1)=1",
          note: "Evaluate the function and first derivative at the center.",
        },
        {
          latex: "f''(1)=-1,\\quad f'''(1)=2",
          note: "Continue through the third derivative.",
        },
        {
          latex:
            "T_3(x)=0+(x-1)-\\frac{(x-1)^2}{2}+\\frac{2(x-1)^3}{6}",
          note: "Substitute the values into the Taylor formula.",
        },
        {
          latex:
            "T_3(x)=(x-1)-\\frac{(x-1)^2}{2}+\\frac{(x-1)^3}{3}",
          note: "Simplify the cubic coefficient.",
        },
      ],
      answer: "The degree-3 Taylor polynomial is (x - 1) - (x - 1)²/2 + (x - 1)³/3.",
    },
    mistakes: [
      {
        title: "Using powers of x at a nonzero center",
        description:
          "A Taylor polynomial centered at a uses powers of x - a. Powers of x alone are for a Maclaurin center.",
      },
      {
        title: "Forgetting the factorial",
        description:
          "The kth derivative value is divided by k!, which changes every coefficient after the first derivative.",
      },
      {
        title: "Treating an approximation as an identity",
        description:
          "A finite Taylor polynomial is a local approximation, not the original function everywhere.",
      },
    ],
    faqs: [
      {
        question: "How are Taylor and Maclaurin series different?",
        answer:
          "A Maclaurin series is a Taylor series centered at zero.",
      },
      {
        question: "How is a Taylor polynomial different from a Taylor series?",
        answer:
          "The polynomial stops at a chosen degree. The series continues infinitely.",
      },
      {
        question: "Which center should I choose?",
        answer:
          "Choose a center near the point of interest where the function and needed derivatives are defined.",
      },
      {
        question: "Does a Taylor series always equal its function?",
        answer:
          "No. Equality requires the series to converge to that function, not only that all derivatives exist.",
      },
    ],
    related: ["derivative", "limit", "series-convergence", "integral"],
  },
  {
    slug: "series-convergence",
    name: "Series Convergence Calculator",
    category: "Calculus",
    seoTitle: "Series Convergence Calculator with Steps",
    description:
      "Test an infinite series for convergence or divergence with clear steps. See which test applies and whether convergence is absolute or conditional.",
    keywords: [
      "series convergence calculator",
      "convergence test calculator",
      "convergent or divergent series calculator",
      "infinite series convergence calculator",
    ],
    heading: "Series Convergence Calculator",
    heroDescription:
      "Choose a valid convergence test, check its conditions, and classify an infinite series.",
    placeholder:
      "Enter a series, such as sum n/(n^3 + 1) from n=1 to infinity",
    solverInstruction:
      "Determine whether the stated infinite series converges or diverges. Name the test used, verify that test's hypotheses, classify convergence as absolute or conditional when relevant, explain when a test is inconclusive, and do not claim an exact sum unless it is actually derived.",
    examples: [
      {
        label: "p-series",
        expression: "test sum 1/n^2 from n=1 to infinity for convergence",
      },
      {
        label: "Alternating series",
        expression: "test sum (-1)^(n+1)/n from n=1 to infinity",
      },
      {
        label: "Limit comparison",
        expression: "test sum n/(n^3 + 1) from n=1 to infinity",
      },
    ],
    overview: {
      heading: "A convergence verdict needs a proof",
      paragraphs: [
        "An infinite series converges when its sequence of partial sums approaches a finite value. Terms approaching zero are necessary, but that condition alone is not enough, as the harmonic series shows.",
        "Different structures call for different tests. Geometric and p-series patterns can settle a problem quickly. Comparison, integral, ratio, root, and alternating-series tests each have conditions that must be checked before their conclusion is valid.",
      ],
    },
    formula: {
      title: "The nth-term divergence test",
      latex:
        "\\lim_{n\\to\\infty}a_n\\ne0\\quad\\Longrightarrow\\quad\\sum_{n=1}^{\\infty}a_n\\text{ diverges}",
      explanation:
        "If the terms do not approach zero, the series diverges. A zero term limit is only a first check and does not prove convergence.",
    },
    methods: [
      {
        title: "Inspect the term pattern",
        description:
          "Look for geometric, p-series, alternating, factorial, exponential, or rational behavior before selecting a test.",
      },
      {
        title: "Verify the test conditions",
        description:
          "Show positivity, monotonicity, comparison bounds, or the required limit instead of naming a test without its hypotheses.",
      },
      {
        title: "Classify the conclusion",
        description:
          "Distinguish absolute convergence, conditional convergence, divergence, and an inconclusive test.",
      },
    ],
    workedExample: {
      problem: "Test Σ n/(n³ + 1) from n = 1 to infinity",
      steps: [
        {
          latex: "b_n=\\frac{1}{n^2}",
          note: "Compare with a convergent p-series.",
        },
        {
          latex:
            "\\lim_{n\\to\\infty}\\frac{n/(n^3+1)}{1/n^2}=\\lim_{n\\to\\infty}\\frac{n^3}{n^3+1}=1",
          note: "Compute the limit comparison ratio.",
        },
        {
          latex: "\\sum_{n=1}^{\\infty}\\frac{1}{n^2}\\text{ converges}",
          note: "The comparison series has p = 2, which is greater than 1.",
        },
      ],
      answer: "The series converges by the limit comparison test. Its terms are positive, so the convergence is absolute.",
    },
    mistakes: [
      {
        title: "Using a zero term limit as proof",
        description:
          "The condition aₙ → 0 is necessary but not sufficient for series convergence.",
      },
      {
        title: "Treating a test value of 1 as a verdict",
        description:
          "A ratio-test or root-test result of 1 is inconclusive and requires another method.",
      },
      {
        title: "Skipping endpoint tests",
        description:
          "A power-series radius gives an open interval. Each boundary point must be tested separately.",
      },
    ],
    faqs: [
      {
        question: "Does aₙ approaching zero prove convergence?",
        answer:
          "No. It is necessary but not sufficient. The harmonic series is the standard counterexample.",
      },
      {
        question: "What is absolute convergence?",
        answer:
          "A series converges absolutely when the series of absolute values converges. Absolute convergence implies ordinary convergence.",
      },
      {
        question: "What if the ratio or root test gives 1?",
        answer:
          "That test is inconclusive. A comparison, integral, alternating, or another suitable test may still decide the series.",
      },
      {
        question: "Does convergence mean the exact sum is known?",
        answer:
          "No. A series can be proven convergent without having a simple closed-form sum.",
      },
    ],
    related: ["limit", "taylor-series", "definite-integral", "integral"],
  },
] satisfies CalculatorDefinition[];
