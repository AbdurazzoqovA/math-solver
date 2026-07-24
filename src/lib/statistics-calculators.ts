import type { CalculatorDefinition } from "./calculators";

const dataInputHint =
  "Enter numbers separated by commas, spaces, or line breaks. State whether the list is a sample or the full population when that distinction matters.";

const probabilityInputHint =
  "Use fractions, decimals from 0 to 1, or percentages. Say whether events are independent, dependent, mutually exclusive, or conditional.";

export const statisticsCalculators = [
  {
    slug: "standard-deviation",
    name: "Standard Deviation Calculator",
    category: "Statistics",
    seoTitle: "Standard Deviation Calculator with Steps",
    description:
      "Calculate sample or population standard deviation from a data list. See the mean, squared deviations, variance, exact work, and rounded result.",
    keywords: [
      "standard deviation calculator",
      "standard deviation calculator with steps",
      "sample standard deviation calculator",
      "population standard deviation calculator",
      "variance calculator",
    ],
    heading: "Standard Deviation Calculator",
    heroDescription:
      "Measure how far values spread from the mean, with the sample or population denominator shown clearly.",
    placeholder:
      "Enter data, such as population standard deviation of 2, 4, 4, 4, 5, 5, 7, 9",
    inputHint: dataInputHint,
    solverInstruction:
      "Calculate standard deviation only from the values the user supplies. Distinguish a full population, which divides by N, from a sample used to estimate a larger population, which divides by n minus 1. If the user does not identify the data type, state the ambiguity and give both results or ask which is intended. Show the count, mean, deviations, squared-deviation sum, variance, and standard deviation. Preserve exact arithmetic until the final approximation, reject sample standard deviation when n is less than 2, retain the original units, and do not confuse standard deviation with standard error or infer normality.",
    examples: [
      {
        label: "Population data",
        expression:
          "population standard deviation of 2, 4, 4, 4, 5, 5, 7, 9",
      },
      {
        label: "Sample data",
        expression: "sample standard deviation of 12, 15, 18, 21",
      },
      {
        label: "Decimal values",
        expression:
          "find the population variance and standard deviation of 9.8, 10.0, 10.1, 10.0, 9.9",
      },
    ],
    overview: {
      heading: "Choose the denominator before doing the arithmetic",
      paragraphs: [
        "Standard deviation describes spread around the mean in the same units as the original data. Values packed close to the mean produce a small result. Values spread across a wider range produce a larger one.",
        "The population formula applies when the list contains every value in the group of interest. The sample formula applies when the list is being used to estimate variability in a larger population. That choice changes the denominator, so it belongs at the start of the calculation.",
      ],
    },
    formula: {
      title: "Population and sample standard deviation",
      latex:
        "\\sigma=\\sqrt{\\frac{\\sum_{i=1}^{N}(x_i-\\mu)^2}{N}},\\qquad s=\\sqrt{\\frac{\\sum_{i=1}^{n}(x_i-\\bar{x})^2}{n-1}}",
      explanation:
        "Both formulas square distances from the mean and then take a square root. The sample formula uses n minus 1 because the population mean was estimated from the sample.",
    },
    methods: [
      {
        title: "Identify sample or population",
        description:
          "Use the population formula for the whole group and the sample formula when the data estimate a larger group.",
      },
      {
        title: "Build the squared deviations",
        description:
          "Find the mean, subtract it from each value, square each deviation, and add those squares.",
      },
      {
        title: "Divide, then take the square root",
        description:
          "Divide by N or n minus 1 to get variance, then take the principal square root to return to the original units.",
      },
    ],
    workedExample: {
      problem:
        "Find the population standard deviation of 2, 4, 4, 4, 5, 5, 7, 9",
      steps: [
        {
          latex:
            "\\mu=\\frac{2+4+4+4+5+5+7+9}{8}=5",
          note: "Find the population mean.",
        },
        {
          latex:
            "\\sum(x_i-\\mu)^2=9+1+1+1+0+0+4+16=32",
          note: "Square every deviation from 5 and add the results.",
        },
        {
          latex:
            "\\sigma^2=\\frac{32}{8}=4",
          note: "Divide by N because the list is being treated as the full population.",
        },
        {
          latex:
            "\\sigma=\\sqrt{4}=2",
          note: "Take the square root of the population variance.",
        },
      ],
      answer:
        "The population variance is 4 and the population standard deviation is 2. If the same values were a sample, the standard deviation would be √(32/7), about 2.138.",
    },
    mistakes: [
      {
        title: "Using the wrong denominator",
        description:
          "Population standard deviation divides by N. Sample standard deviation divides by n minus 1.",
      },
      {
        title: "Averaging signed deviations",
        description:
          "Deviations from the mean sum to zero, so they must be squared before they are averaged.",
      },
      {
        title: "Stopping at variance",
        description:
          "Variance uses squared units. Standard deviation is the square root of variance and returns to the data's units.",
      },
    ],
    faqs: [
      {
        question: "Should I use sample or population standard deviation?",
        answer:
          "Use population standard deviation when your data includes the entire group you want to describe. Use sample standard deviation when the data is a subset used to estimate a larger group.",
      },
      {
        question: "Why does sample standard deviation use n minus 1?",
        answer:
          "The sample mean is estimated from the same data. Dividing the squared-deviation sum by n minus 1 corrects the downward bias in the sample variance estimator.",
      },
      {
        question: "Can standard deviation be negative?",
        answer:
          "No. Squared deviations are nonnegative, and the principal square root of their average is also nonnegative.",
      },
      {
        question: "Is standard deviation the same as standard error?",
        answer:
          "No. Standard deviation describes variation among observations. Standard error describes variation in an estimate across repeated samples.",
      },
    ],
    related: [
      "mean-median-mode",
      "z-score",
      "probability",
      "permutation-combination",
    ],
  },
  {
    slug: "mean-median-mode",
    name: "Mean Median Mode Calculator",
    category: "Statistics",
    seoTitle: "Mean Median Mode Calculator with Steps",
    description:
      "Find the mean, median, and mode of a number list with clear steps. See the sorted data, total, middle position, frequencies, and range.",
    keywords: [
      "mean median mode calculator",
      "mean median mode calculator with steps",
      "average median mode calculator",
      "measures of central tendency calculator",
      "mean calculator",
    ],
    heading: "Mean Median Mode Calculator",
    heroDescription:
      "Compare three measures of center and see how sorting, frequencies, and outliers affect them.",
    placeholder:
      "Enter a data set, such as find mean, median, and mode of 7, 3, 3, 10, 12",
    inputHint:
      "Enter a raw list separated by commas, spaces, or line breaks. For a frequency table, write pairs such as 5:3, 6:1, 7:2.",
    solverInstruction:
      "Calculate the requested measures of center from exactly the values or value-frequency pairs supplied. Sort the data visibly for the median, show the sum and count for the mean, and count frequencies for the mode. For an even number of observations, average the two middle values. Report every value tied for highest frequency when that frequency is greater than one. If no value occurs more often than the others, say there is no mode under the common classroom convention and name that convention. Reject nonpositive or noninteger frequencies, preserve exact fractions until the final approximation, and do not claim that one measure is always the right summary.",
    examples: [
      {
        label: "One clear mode",
        expression: "find mean, median, and mode of 7, 3, 3, 10, 12",
      },
      {
        label: "Even data count",
        expression: "find mean, median, and mode of 2, 4, 6, 8",
      },
      {
        label: "Frequency table",
        expression:
          "find mean, median, and mode for values and frequencies 5:3, 6:1, 7:2",
      },
    ],
    overview: {
      heading: "The center depends on the question",
      paragraphs: [
        "The mean uses every value, the median uses position after sorting, and the mode uses frequency. They can agree in a balanced data set and differ sharply when the data is skewed or contains an extreme value.",
        "Paste the observations as a list or enter value-frequency pairs. The result keeps the sorted order and frequency counts visible, which makes the median and mode easier to check than a final answer alone.",
      ],
    },
    formula: {
      title: "Three measures of center",
      latex:
        "\\bar{x}=\\frac{\\sum_{i=1}^{n}x_i}{n},\\qquad \\operatorname{median}=\\text{middle of sorted data},\\qquad \\operatorname{mode}=\\text{most frequent value}",
      explanation:
        "The mean is arithmetic, the median is positional, and the mode is based on repeated values. A data set may have more than one mode.",
    },
    methods: [
      {
        title: "Count and add the values",
        description:
          "Divide the total by the number of observations to find the arithmetic mean.",
      },
      {
        title: "Sort before finding the median",
        description:
          "Use the single middle value for an odd count or average the two middle values for an even count.",
      },
      {
        title: "Build a frequency count",
        description:
          "The most frequent value is the mode. A tie at the highest repeated frequency produces multiple modes.",
      },
    ],
    workedExample: {
      problem: "Find the mean, median, and mode of 7, 3, 3, 10, 12",
      steps: [
        {
          latex:
            "3,\\ 3,\\ 7,\\ 10,\\ 12",
          note: "Sort the five values from least to greatest.",
        },
        {
          latex:
            "\\bar{x}=\\frac{7+3+3+10+12}{5}=\\frac{35}{5}=7",
          note: "Add all values and divide by the count.",
        },
        {
          latex:
            "\\operatorname{median}=7",
          note: "The third value is the middle of the sorted list.",
        },
        {
          latex:
            "\\operatorname{mode}=3",
          note: "The value 3 occurs twice, more often than any other value.",
        },
      ],
      answer:
        "The mean is 7, the median is 7, and the mode is 3. The range is 12 minus 3, which equals 9.",
    },
    mistakes: [
      {
        title: "Finding the median before sorting",
        description:
          "The median is based on ordered position, not the value that happens to appear in the middle of the input.",
      },
      {
        title: "Choosing only one mode",
        description:
          "If several repeated values share the highest frequency, report all of them.",
      },
      {
        title: "Assuming mean means typical",
        description:
          "An extreme value can pull the mean far from most observations, so the median may describe a skewed data set better.",
      },
    ],
    faqs: [
      {
        question: "Can a data set have more than one mode?",
        answer:
          "Yes. If several values share the highest repeated frequency, the data is multimodal and each tied value is a mode.",
      },
      {
        question: "What if every value appears once?",
        answer:
          "Under the common classroom convention, the data has no mode because no value occurs more often than the others.",
      },
      {
        question: "Why can the mean and median be different?",
        answer:
          "The mean uses the size of every value, so an outlier can move it. The median depends only on ordered position and is less sensitive to extremes.",
      },
      {
        question: "How is the median found with an even number of values?",
        answer:
          "Sort the data, identify the two middle values, and take their arithmetic mean.",
      },
    ],
    related: [
      "standard-deviation",
      "z-score",
      "probability",
      "permutation-combination",
    ],
  },
  {
    slug: "probability",
    name: "Probability Calculator",
    category: "Statistics",
    seoTitle: "Probability Calculator with Steps",
    description:
      "Calculate simple, joint, union, complement, and conditional probabilities with clear steps. State event relationships and keep exact fractions.",
    keywords: [
      "probability calculator",
      "probability calculator with steps",
      "conditional probability calculator",
      "independent events probability calculator",
      "probability of two events",
    ],
    heading: "Probability Calculator",
    heroDescription:
      "Translate an event question into the right rule without assuming independence or double-counting overlap.",
    placeholder:
      "Enter a probability problem, such as draw 2 red balls without replacement from 5 red and 3 blue",
    inputHint: probabilityInputHint,
    solverInstruction:
      "Solve the stated event probability and define the events before calculating. Accept exact counts, fractions, decimals from 0 to 1, or percentages, and reject invalid probability values. Never multiply marginal probabilities unless independence is given or established. For dependent events use conditional probability. Never add event probabilities without subtracting overlap unless the events are mutually exclusive. Distinguish union, intersection, complement, conditional probability, and exactly-one probability. Preserve exact fractions, state every modeling assumption, and do not apply a named probability distribution unless its conditions are supplied.",
    examples: [
      {
        label: "Single event",
        expression: "probability of rolling an even number on a fair six-sided die",
      },
      {
        label: "Independent events",
        expression:
          "probability of a head on a fair coin and a 6 on a fair die",
      },
      {
        label: "Without replacement",
        expression:
          "probability of drawing 2 red balls without replacement from 5 red and 3 blue",
      },
    ],
    overview: {
      heading: "Event relationships choose the rule",
      paragraphs: [
        "A probability is a number from 0 to 1 that measures how likely an event is under a stated model. Counts can be divided directly only when the outcomes in the sample space are equally likely.",
        "For two events, words such as and, or, given, without replacement, and at least one carry mathematical meaning. The calculator names that relationship before it substitutes numbers, which prevents the most common addition and multiplication errors.",
      ],
    },
    formula: {
      title: "The multiplication rule",
      latex:
        "P(A\\cap B)=P(A)P(B\\mid A)",
      explanation:
        "The probability that both events occur equals the chance of the first event times the conditional chance of the second. For independent events, the conditional probability equals P(B).",
    },
    methods: [
      {
        title: "Define the event and sample space",
        description:
          "List what counts as success and confirm whether the elementary outcomes are equally likely.",
      },
      {
        title: "Name the relationship",
        description:
          "Decide whether the problem involves a complement, union, intersection, conditional event, or independent repetition.",
      },
      {
        title: "Use a check between 0 and 1",
        description:
          "Simplify exact fractions and confirm the final probability is neither negative nor greater than 1.",
      },
    ],
    workedExample: {
      problem:
        "A bag has 5 red and 3 blue balls. Find the probability of drawing 2 red balls without replacement",
      steps: [
        {
          latex:
            "P(R_1)=\\frac{5}{8}",
          note: "Five of the eight balls are red on the first draw.",
        },
        {
          latex:
            "P(R_2\\mid R_1)=\\frac{4}{7}",
          note: "After one red ball is removed, four red balls remain among seven total.",
        },
        {
          latex:
            "P(R_1\\cap R_2)=\\frac{5}{8}\\cdot\\frac{4}{7}=\\frac{20}{56}=\\frac{5}{14}",
          note: "Use the conditional multiplication rule because the draws are dependent.",
        },
      ],
      answer:
        "The probability of two red balls is 5/14, about 0.3571 or 35.71%.",
    },
    mistakes: [
      {
        title: "Assuming independence",
        description:
          "Without-replacement draws and many conditional events change the probability of what happens next.",
      },
      {
        title: "Adding overlapping events directly",
        description:
          "For P(A or B), subtract P(A and B) unless the events are mutually exclusive.",
      },
      {
        title: "Counting unequal outcomes as equal",
        description:
          "Favorable outcomes divided by total outcomes works only when the underlying outcomes have equal probability.",
      },
    ],
    faqs: [
      {
        question: "What is the probability of an impossible event?",
        answer:
          "It is 0. A certain event has probability 1, and every valid probability lies between those values.",
      },
      {
        question: "When can I multiply two probabilities?",
        answer:
          "Use P(A)P(B) for independent events. For dependent events, use P(A)P(B given A) or the equivalent reversed form.",
      },
      {
        question: "Are independent events the same as mutually exclusive events?",
        answer:
          "No. Independent events do not change each other's probabilities. Mutually exclusive events cannot occur together.",
      },
      {
        question: "How do I find the probability of at least one event?",
        answer:
          "Often the quickest method is the complement rule: subtract the probability of none from 1.",
      },
    ],
    related: [
      "permutation-combination",
      "z-score",
      "standard-deviation",
      "mean-median-mode",
    ],
  },
  {
    slug: "permutation-combination",
    name: "Permutation and Combination Calculator",
    category: "Statistics",
    seoTitle: "Permutation and Combination Calculator with Steps",
    description:
      "Calculate nPr permutations and nCr combinations with factorial steps. Decide whether order matters and handle valid counting inputs clearly.",
    keywords: [
      "permutation combination calculator",
      "permutation calculator",
      "combination calculator",
      "nPr calculator",
      "nCr calculator",
    ],
    heading: "Permutation and Combination Calculator",
    heroDescription:
      "Count ordered arrangements and unordered selections, with the order decision made before the factorials.",
    placeholder:
      "Enter n and r, such as compare 8P3 and 8C3",
    inputHint:
      "Enter nonnegative integers n and r with r no greater than n. State whether order matters, and mention repetition or identical items.",
    solverInstruction:
      "Solve the counting problem only after deciding whether order matters. For nPr and nCr, require nonnegative integers with 0 less than or equal to r less than or equal to n, assume distinct objects without replacement only when that is stated or clearly intended, and use 0 factorial equals 1. Show factorial cancellation instead of expanding unnecessarily large factorials. If repetition is allowed, objects are identical, or positions have restrictions, use the appropriate counting model and explain why the basic nPr or nCr formula does not apply unchanged. Return an exact integer and do not turn a counting result into a probability unless the user asks and supplies a valid sample space.",
    examples: [
      {
        label: "Ordered selection",
        expression: "calculate 8P3",
      },
      {
        label: "Unordered selection",
        expression: "calculate 8C3",
      },
      {
        label: "Word problem",
        expression:
          "how many 4-person committees can be chosen from 10 people",
      },
    ],
    overview: {
      heading: "Order is the deciding question",
      paragraphs: [
        "A permutation counts arrangements, so choosing Ana then Ben differs from choosing Ben then Ana. A combination counts groups, so those two orders represent the same selection.",
        "The familiar nPr and nCr formulas assume distinct items selected without replacement. If repetition is allowed or some items are identical, say so in the problem because the counting model changes.",
      ],
    },
    formula: {
      title: "Permutation and combination formulas",
      latex:
        "{}_nP_r=\\frac{n!}{(n-r)!},\\qquad {}_nC_r=\\binom{n}{r}=\\frac{n!}{r!(n-r)!}",
      explanation:
        "Permutations keep the order of the selected items. Combinations divide by r factorial because the r selected items can be reordered without creating a new group.",
    },
    methods: [
      {
        title: "Ask whether order matters",
        description:
          "Ranks, roles, codes, and seatings usually use permutations. Committees and unordered groups use combinations.",
      },
      {
        title: "Check replacement and repetition",
        description:
          "The basic nPr and nCr formulas select distinct items without replacement. Repeated choices require a different rule.",
      },
      {
        title: "Cancel factorials efficiently",
        description:
          "Expand only the factors that survive cancellation, then return the exact whole-number count.",
      },
    ],
    workedExample: {
      problem:
        "From 8 students, count an ordered slate of 3 officers and an unordered 3-person committee",
      steps: [
        {
          latex:
            "{}_8P_3=\\frac{8!}{5!}=8\\cdot7\\cdot6=336",
          note: "The three officer roles are different, so order matters.",
        },
        {
          latex:
            "{}_8C_3=\\frac{8!}{3!5!}=\\frac{8\\cdot7\\cdot6}{3\\cdot2\\cdot1}=56",
          note: "A committee has no role order, so divide out the 3 factorial arrangements.",
        },
        {
          latex:
            "{}_8P_3=3!\\,{}_8C_3",
          note: "Each committee can be assigned to the three officer roles in 3 factorial ways.",
        },
      ],
      answer:
        "There are 336 ordered officer slates and 56 unordered 3-person committees.",
    },
    mistakes: [
      {
        title: "Ignoring order",
        description:
          "A choice of people and an assignment to distinct roles are different counting problems.",
      },
      {
        title: "Using r greater than n",
        description:
          "Without replacement, the number selected cannot exceed the number of available distinct items.",
      },
      {
        title: "Forgetting repetition changes the rule",
        description:
          "Codes with repeated symbols and arrangements with identical items are not handled by the basic nPr formula.",
      },
    ],
    faqs: [
      {
        question: "What is the difference between nPr and nCr?",
        answer:
          "nPr counts ordered selections. nCr counts unordered groups and treats rearrangements of the same selected items as one result.",
      },
      {
        question: "Why does the combination formula divide by r factorial?",
        answer:
          "The permutation count includes every ordering of the same r selected items. Dividing by r factorial removes those duplicates.",
      },
      {
        question: "What is 0 factorial?",
        answer:
          "By definition, 0! equals 1. This keeps counting identities such as nC0 = 1 consistent.",
      },
      {
        question: "Can I use nPr when repetition is allowed?",
        answer:
          "Not unchanged. For r ordered choices from n options with replacement, the count is n to the power r.",
      },
    ],
    related: [
      "probability",
      "mean-median-mode",
      "standard-deviation",
      "z-score",
    ],
  },
  {
    slug: "z-score",
    name: "Z-Score Calculator",
    category: "Statistics",
    seoTitle: "Z-Score Calculator with Steps",
    description:
      "Convert a raw value to a z-score from its mean and standard deviation. See the signed distance from the mean and reverse the formula when needed.",
    keywords: [
      "z score calculator",
      "z score calculator with steps",
      "standard score calculator",
      "raw score to z score",
      "find z score from mean and standard deviation",
    ],
    heading: "Z-Score Calculator",
    heroDescription:
      "Standardize a value as a signed number of standard deviations from its mean.",
    placeholder:
      "Enter a raw score, mean, and standard deviation, such as x = 85, mean = 70, SD = 10",
    inputHint:
      "Provide the raw value x, the matching mean, and a positive standard deviation. Say whether these are population or sample summaries.",
    solverInstruction:
      "Calculate the descriptive z-score using the supplied raw value, matching mean, and positive standard deviation. Use population notation when mu and sigma are given and sample notation when x-bar and s are given. Show the signed difference from the mean before dividing, preserve the sign, and explain the result in standard-deviation units. If solving backward, rearrange to x equals mean plus z times standard deviation. Reject a zero or negative standard deviation. Do not convert the z-score to a percentile or tail probability unless a normal distribution is explicitly stated, do not label a value an outlier from a fixed z threshold alone, and do not confuse a descriptive z-score with a z-test statistic.",
    examples: [
      {
        label: "Above the mean",
        expression: "find z for x = 85, mean = 70, standard deviation = 10",
      },
      {
        label: "Below the mean",
        expression: "find z for x = 42, mean = 50, standard deviation = 4",
      },
      {
        label: "Recover a raw score",
        expression:
          "find x when z = -1.2, mean = 100, standard deviation = 15",
      },
    ],
    overview: {
      heading: "A z-score is a standardized location",
      paragraphs: [
        "A z-score tells how many standard deviations a value sits above or below its mean. Positive scores are above the mean, negative scores are below it, and zero is exactly at the mean.",
        "Standardizing puts measurements from different scales into comparable units. It does not make the original data normal, and a percentile interpretation needs a distribution model rather than the z-score formula alone.",
      ],
    },
    formula: {
      title: "Raw score to standard score",
      latex:
        "z=\\frac{x-\\mu}{\\sigma}",
      explanation:
        "Subtract the mean to get the signed distance, then divide by the standard deviation to express that distance in standardized units.",
    },
    methods: [
      {
        title: "Match the value to its summary",
        description:
          "Use a mean and standard deviation computed for the same variable, group, and units as the raw score.",
      },
      {
        title: "Keep the sign of the difference",
        description:
          "The sign shows which side of the mean contains the value and must remain visible through the division.",
      },
      {
        title: "Interpret without overreaching",
        description:
          "Describe distance from the mean directly. Add percentiles or normal tail areas only when a normal model is stated.",
      },
    ],
    workedExample: {
      problem:
        "Find the z-score for x = 85 when the mean is 70 and the standard deviation is 10",
      steps: [
        {
          latex:
            "x-\\mu=85-70=15",
          note: "The raw score is 15 units above the mean.",
        },
        {
          latex:
            "z=\\frac{85-70}{10}=\\frac{15}{10}=1.5",
          note: "Divide the signed difference by the positive standard deviation.",
        },
        {
          latex:
            "x=\\mu+z\\sigma=70+1.5(10)=85",
          note: "Reverse the standardization to check the result.",
        },
      ],
      answer:
        "The z-score is 1.5, so the raw value is 1.5 standard deviations above the mean.",
    },
    mistakes: [
      {
        title: "Reversing the subtraction",
        description:
          "Use raw value minus mean. Reversing the order changes the sign and the interpretation.",
      },
      {
        title: "Using standard error by accident",
        description:
          "A descriptive z-score for one observation divides by the distribution's standard deviation, not the standard error of a sample mean.",
      },
      {
        title: "Treating z as a percentile",
        description:
          "A z-score is a standardized distance. Converting it to a percentile requires a stated distribution, commonly a normal model.",
      },
    ],
    faqs: [
      {
        question: "What does a negative z-score mean?",
        answer:
          "It means the raw value is below the mean. The magnitude tells how many standard deviations separate them.",
      },
      {
        question: "Can a z-score be greater than 3?",
        answer:
          "Yes. Z-scores are not restricted to a fixed interval, although large magnitudes may be unusual under some distribution models.",
      },
      {
        question: "Does a z-score require normally distributed data?",
        answer:
          "No for standardizing a value. Normality is needed only when using the z-score to read probabilities or percentiles from the standard normal distribution.",
      },
      {
        question: "How do I convert a z-score back to a raw value?",
        answer:
          "Use x = mean + z times standard deviation, keeping all three quantities from the same distribution.",
      },
    ],
    related: [
      "standard-deviation",
      "mean-median-mode",
      "probability",
      "permutation-combination",
    ],
  },
] satisfies CalculatorDefinition[];
