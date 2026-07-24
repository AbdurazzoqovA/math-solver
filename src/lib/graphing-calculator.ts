import type { CalculatorDefinition } from "./calculators";

export const graphingCalculators = [
  {
    slug: "graphing",
    name: "Graphing Calculator",
    category: "Graphing",
    seoTitle: "Free Graphing Calculator Online",
    description:
      "Plot up to four functions on an interactive coordinate plane. Compare curves, adjust the viewing window, trace coordinates, and ask for an explanation.",
    keywords: [
      "graphing calculator",
      "online graphing calculator",
      "function graph calculator",
      "plot functions online",
    ],
    heading: "Graphing Calculator",
    heroDescription:
      "Plot functions of x, compare curves on the same axes, and explore how each equation behaves.",
    placeholder: "Enter a function, such as x^2 - 4",
    inputHint:
      "Use explicit functions of x. Supported syntax includes powers, parentheses, pi, e, sin, cos, tan, sqrt, abs, ln, log, and exp.",
    solverInstruction:
      "Analyze only the explicit function or functions named by the user. Identify domain, range, intercepts, extrema, symmetry, asymptotes, end behavior, and transformations when they apply. Distinguish exact conclusions from visual estimates, preserve exact values when possible, and do not claim the plotted window proves global behavior.",
    tool: {
      kind: "graphing",
      initialExpressions: ["x^2 - 4"],
    },
    examples: [
      { label: "Parabola", expression: "x^2 - 4" },
      { label: "Sine wave", expression: "sin(x)" },
      { label: "Exponential", expression: "2^x" },
    ],
    overview: {
      heading: "A graph turns a formula into a shape",
      paragraphs: [
        "For an explicit function y = f(x), every allowed x-value is paired with an output. Plotting many of those pairs reveals intercepts, turning points, symmetry, periodic behavior, growth, and discontinuities that may be harder to notice in the formula alone.",
        "This tool plots up to four functions of x on the same coordinate plane. You can hide a curve, drag to pan, zoom, set exact axis limits, and trace coordinates. The explanation button sends the visible functions to the shared tutor for a step-by-step analysis.",
      ],
    },
    formula: {
      title: "Points on a function graph",
      latex: "y=f(x)\\quad\\Longleftrightarrow\\quad (x,f(x))",
      explanation:
        "Choose an input x, calculate f(x), and plot the ordered pair. Repeating that process across the domain traces the curve.",
    },
    methods: [
      {
        title: "Enter one explicit function per row",
        description:
          "Use x as the variable. Add more rows when you want to compare equations on the same axes.",
      },
      {
        title: "Choose a useful viewing window",
        description:
          "A curve can look empty or misleading when its important features lie outside the current x or y range.",
      },
      {
        title: "Confirm features algebraically",
        description:
          "Use the graph to locate likely roots or turning points, then solve or differentiate when an exact value matters.",
      },
    ],
    workedExample: {
      problem: "Analyze the graph of y = x² - 4",
      steps: [
        {
          latex: "y=x^2-4=(x-2)(x+2)",
          note: "Factoring shows x-intercepts at x = -2 and x = 2.",
        },
        {
          latex: "x=0\\Longrightarrow y=-4",
          note: "The y-intercept is (0, -4), which is also the vertex.",
        },
        {
          latex: "x^2\\ge 0\\Longrightarrow x^2-4\\ge -4",
          note: "The parabola opens upward, so its minimum output is -4.",
        },
      ],
      answer:
        "The graph has vertex (0, -4), x-intercepts (-2, 0) and (2, 0), y-intercept (0, -4), domain all real numbers, and range y ≥ -4.",
    },
    mistakes: [
      {
        title: "Trusting the default window",
        description:
          "A root, asymptote, or turning point may exist outside the visible range. Adjust the axes before concluding it is absent.",
      },
      {
        title: "Connecting across a discontinuity",
        description:
          "Functions such as 1/x have separate branches. A vertical asymptote is not part of the graph.",
      },
      {
        title: "Reading an estimate as exact",
        description:
          "A traced coordinate is a numerical estimate unless algebra or another exact method confirms it.",
      },
    ],
    faqs: [
      {
        question: "How many functions can I graph at once?",
        answer:
          "You can plot up to four explicit functions of x and hide individual curves while comparing them.",
      },
      {
        question: "Which function syntax is supported?",
        answer:
          "Use arithmetic, parentheses, powers with ^, x, pi, e, and common functions such as sin, cos, tan, sqrt, abs, ln, log, and exp.",
      },
      {
        question: "Can this graph implicit or polar equations?",
        answer:
          "Not yet. The current tool focuses on explicit functions in the form y = f(x).",
      },
      {
        question: "Why is my graph not visible?",
        answer:
          "Check the expression for an error, then reset or widen the viewing window. The function may also be undefined over the visible x-range.",
      },
    ],
    related: [
      "slope",
      "domain-range",
      "derivative",
      "function-composition",
    ],
  },
] satisfies CalculatorDefinition[];
