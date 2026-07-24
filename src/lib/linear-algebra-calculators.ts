import type { CalculatorDefinition } from "./calculators";

const matrixInputHint =
  "Enter rows in one line, such as [[1, 2], [3, 4]]. State the operation when the page accepts more than one.";

const vectorInputHint =
  "Enter vectors in brackets, such as [1, 2, 3]. Keep both vectors in the same coordinate order.";

export const linearAlgebraCalculators = [
  {
    slug: "matrix",
    name: "Matrix Calculator",
    category: "Linear Algebra",
    seoTitle: "Matrix Calculator with Steps",
    description:
      "Add, subtract, multiply, transpose, and row reduce matrices with clear steps. Paste matrix values, choose an operation, and keep exact fractions.",
    keywords: [
      "matrix calculator",
      "matrix calculator with steps",
      "matrix operations calculator",
      "matrix multiplication calculator",
    ],
    heading: "Matrix Calculator",
    heroDescription:
      "Perform matrix operations with dimension checks, exact entries, and each row or column calculation shown.",
    placeholder:
      "Enter an operation, such as multiply [[1,2],[3,4]] by [[2,0],[1,2]]",
    inputHint: matrixInputHint,
    solverInstruction:
      "Perform the matrix operation explicitly requested by the user. Parse bracketed rows exactly, never invent or pad entries, state matrix dimensions before calculating, enforce compatibility rules, preserve exact fractions when possible, and keep detailed row work to a reasonable size.",
    examples: [
      {
        label: "Addition",
        expression: "add [[1,2],[3,4]] and [[5,6],[7,8]]",
      },
      {
        label: "Multiplication",
        expression:
          "multiply [[1,2,-1],[0,3,4]] by [[2,1],[-1,0],[3,2]]",
      },
      {
        label: "Row reduction",
        expression: "find the RREF of [[1,2,3],[2,4,6]]",
      },
    ],
    overview: {
      heading: "Matrix operations begin with dimensions",
      paragraphs: [
        "A matrix is a rectangular array, and its shape controls which operations are defined. Addition and subtraction require matching dimensions. Multiplication uses row-by-column products and requires the inner dimensions to agree.",
        "State the operation and enter each row inside brackets. The calculator can add, subtract, multiply by a scalar, multiply matrices, transpose, or row reduce. Specialized determinant, inverse, and eigenvalue pages keep those larger methods separate.",
      ],
    },
    formula: {
      title: "Matrix multiplication entry rule",
      latex:
        "(AB)_{ij}=\\sum_{k=1}^{n}a_{ik}b_{kj}",
      explanation:
        "Each result entry is the dot product of one row from the first matrix and one column from the second.",
    },
    methods: [
      {
        title: "Write the dimensions first",
        description:
          "Confirm equal shapes for addition or matching inner dimensions for multiplication before doing arithmetic.",
      },
      {
        title: "Keep the order fixed",
        description:
          "Matrix multiplication is generally not commutative, so AB and BA are different calculations and one may be undefined.",
      },
      {
        title: "Preserve exact entries",
        description:
          "Use fractions through row operations and round only when the problem specifically requests a decimal result.",
      },
    ],
    workedExample: {
      problem: "Multiply A by B",
      steps: [
        {
          latex:
            "A=\\begin{bmatrix}1&2&-1\\\\0&3&4\\end{bmatrix},\\quad B=\\begin{bmatrix}2&1\\\\-1&0\\\\3&2\\end{bmatrix}",
          note: "The inner dimensions match: (2 × 3)(3 × 2), so AB will be 2 × 2.",
        },
        {
          latex:
            "c_{11}=1(2)+2(-1)+(-1)(3)=-3,\\quad c_{12}=1(1)+2(0)+(-1)(2)=-1",
          note: "Use the first row of A with both columns of B.",
        },
        {
          latex:
            "c_{21}=0(2)+3(-1)+4(3)=9,\\quad c_{22}=0(1)+3(0)+4(2)=8",
          note: "Repeat with the second row of A.",
        },
        {
          latex:
            "AB=\\begin{bmatrix}-3&-1\\\\9&8\\end{bmatrix}",
          note: "Place each dot product in its matching row and column.",
        },
      ],
      answer: "The product is a 2 × 2 matrix with rows [-3, -1] and [9, 8].",
    },
    mistakes: [
      {
        title: "Multiplying matching entries",
        description:
          "Matrix multiplication uses row-by-column dot products, not entry-by-entry multiplication.",
      },
      {
        title: "Checking the wrong dimensions",
        description:
          "For AB, compare the columns of A with the rows of B. The outer dimensions give the result size.",
      },
      {
        title: "Assuming AB equals BA",
        description:
          "Changing the order changes the row-column pairings and can even make the product undefined.",
      },
    ],
    faqs: [
      {
        question: "Can I multiply matrices of different sizes?",
        answer:
          "Yes, when the number of columns in the first matrix equals the number of rows in the second.",
      },
      {
        question: "Why can AB exist when BA does not?",
        answer:
          "Reversing the order changes which inner dimensions must match.",
      },
      {
        question: "Can I use a non-square matrix?",
        answer:
          "Yes for operations such as transpose, scalar multiplication, compatible multiplication, and row reduction.",
      },
      {
        question: "Why should I keep fractions exact?",
        answer:
          "Exact fractions prevent rounding drift from accumulating across several row operations.",
      },
    ],
    related: [
      "determinant",
      "matrix-inverse",
      "eigenvalue",
      "systems-of-equations",
    ],
  },
  {
    slug: "determinant",
    name: "Determinant Calculator",
    category: "Linear Algebra",
    seoTitle: "Determinant Calculator with Steps",
    description:
      "Find the determinant of a 2×2, 3×3, or larger square matrix with clear steps. See cofactor expansion or row reduction and the exact result.",
    keywords: [
      "determinant calculator",
      "matrix determinant calculator",
      "determinant calculator with steps",
      "3x3 determinant calculator",
    ],
    heading: "Determinant Calculator",
    heroDescription:
      "Calculate the scalar determinant of a square matrix and track every cofactor sign or row-operation effect.",
    placeholder:
      "Enter a square matrix, such as det([[2,1],[5,3]])",
    inputHint: matrixInputHint,
    solverInstruction:
      "Calculate the determinant of the supplied matrix. Parse entries exactly, reject non-square matrices, use cofactor expansion or row reduction as appropriate, track row swaps and row scaling correctly, preserve exact arithmetic, and return one scalar result.",
    examples: [
      {
        label: "2 × 2",
        expression: "det([[2,1],[5,3]])",
      },
      {
        label: "3 × 3",
        expression: "det([[2,1,0],[-1,3,2],[0,4,1]])",
      },
      {
        label: "With fractions",
        expression: "det([[1/2,2],[-3,4]])",
      },
    ],
    overview: {
      heading: "A determinant is one number from a square matrix",
      paragraphs: [
        "The determinant records signed scale change and gives a quick test for invertibility. A zero determinant means the matrix is singular, so its columns are linearly dependent and an ordinary inverse does not exist.",
        "Small matrices are often easiest by a direct formula or cofactor expansion. Row reduction scales better, but every row swap and row scaling must be recorded because those operations change the determinant.",
      ],
    },
    formula: {
      title: "Determinant of a 2 × 2 matrix",
      latex:
        "\\det\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}=ad-bc",
      explanation:
        "Multiply along the main diagonal, subtract the product along the other diagonal, and return the scalar value.",
    },
    methods: [
      {
        title: "Confirm the matrix is square",
        description:
          "A determinant is defined here only when the matrix has the same number of rows and columns.",
      },
      {
        title: "Choose an efficient expansion",
        description:
          "Use a row or column with zeros for cofactors, or use elimination for a larger dense matrix.",
      },
      {
        title: "Track row-operation effects",
        description:
          "A row swap flips the sign, row scaling changes the determinant, and row replacement leaves it unchanged.",
      },
    ],
    workedExample: {
      problem: "Find the determinant of A",
      steps: [
        {
          latex:
            "A=\\begin{bmatrix}2&1&0\\\\-1&3&2\\\\0&4&1\\end{bmatrix}",
          note: "Expand along the first row because it contains a zero.",
        },
        {
          latex:
            "\\det(A)=2\\begin{vmatrix}3&2\\\\4&1\\end{vmatrix}-1\\begin{vmatrix}-1&2\\\\0&1\\end{vmatrix}",
          note: "Apply the alternating cofactor signs.",
        },
        {
          latex:
            "\\det(A)=2(3-8)-((-1)-0)=-10+1=-9",
          note: "Evaluate each 2 × 2 minor and simplify.",
        },
      ],
      answer: "The determinant is -9, so the matrix is invertible.",
    },
    mistakes: [
      {
        title: "Using a non-square matrix",
        description:
          "The determinant in standard linear algebra is defined only for square matrices.",
      },
      {
        title: "Forgetting cofactor signs",
        description:
          "The signs alternate in a checkerboard pattern beginning with positive in the top-left position.",
      },
      {
        title: "Ignoring a row swap",
        description:
          "Every row exchange multiplies the determinant by -1.",
      },
    ],
    faqs: [
      {
        question: "What does a determinant tell me?",
        answer:
          "It measures signed scale change and shows whether a square matrix is invertible.",
      },
      {
        question: "What does determinant zero mean?",
        answer:
          "The matrix is singular, its columns are linearly dependent, and it has no ordinary inverse.",
      },
      {
        question: "Does swapping two rows change the determinant?",
        answer:
          "Yes. One row swap multiplies the determinant by -1.",
      },
      {
        question: "Which method is best for a large matrix?",
        answer:
          "Elimination is usually more efficient. Cofactor expansion is useful when a row or column has many zeros.",
      },
    ],
    related: ["matrix", "matrix-inverse", "eigenvalue", "systems-of-equations"],
  },
  {
    slug: "matrix-inverse",
    name: "Inverse Matrix Calculator",
    category: "Linear Algebra",
    seoTitle: "Inverse Matrix Calculator with Steps",
    description:
      "Find the inverse of a 2×2, 3×3, or larger matrix with clear steps. See the Gauss-Jordan work, determinant check, and identity verification.",
    keywords: [
      "inverse matrix calculator",
      "matrix inverse calculator",
      "inverse matrix calculator with steps",
      "gauss jordan inverse calculator",
    ],
    heading: "Inverse Matrix Calculator",
    heroDescription:
      "Find A⁻¹ with exact row operations, detect a singular matrix, and verify the result with the identity.",
    placeholder:
      "Enter a square matrix, such as inverse([[2,1],[5,3]])",
    inputHint: matrixInputHint,
    solverInstruction:
      "Find the ordinary two-sided inverse of the supplied square matrix. Parse entries exactly, reject non-square input, detect singularity before dividing, show Gauss-Jordan or the requested method, preserve exact fractions, and verify the result with matrix multiplication when reasonably short.",
    examples: [
      {
        label: "2 × 2 inverse",
        expression: "inverse([[2,1],[5,3]])",
      },
      {
        label: "Singular matrix",
        expression: "determine whether inverse([[1,2],[2,4]]) exists",
      },
      {
        label: "3 × 3 inverse",
        expression: "inverse([[1,0,2],[-1,3,1],[3,1,0]])",
      },
    ],
    overview: {
      heading: "An inverse undoes a square matrix transformation",
      paragraphs: [
        "A matrix inverse satisfies AA⁻¹ = A⁻¹A = I. It exists only for a square, nonsingular matrix. A determinant of zero or a missing pivot during row reduction means there is no ordinary inverse.",
        "Gauss-Jordan elimination works by applying every row operation to the augmented matrix [A | I]. When the left side becomes the identity, the right side is A⁻¹. For a 2 × 2 matrix, the determinant formula is often quicker.",
      ],
    },
    formula: {
      title: "Inverse of a 2 × 2 matrix",
      latex:
        "\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}^{-1}=\\frac{1}{ad-bc}\\begin{bmatrix}d&-b\\\\-c&a\\end{bmatrix}",
      explanation:
        "Swap the diagonal entries, negate the off-diagonal entries, and divide by the nonzero determinant.",
    },
    methods: [
      {
        title: "Check invertibility",
        description:
          "Confirm the matrix is square and that its determinant is nonzero before applying an inverse formula.",
      },
      {
        title: "Apply every row operation to both sides",
        description:
          "In [A | I], each swap, scaling, or row replacement must affect the entire augmented row.",
      },
      {
        title: "Multiply to verify",
        description:
          "A correct result produces the identity when multiplied by A in either order.",
      },
    ],
    workedExample: {
      problem: "Find the inverse of A",
      steps: [
        {
          latex:
            "A=\\begin{bmatrix}2&1\\\\5&3\\end{bmatrix},\\quad \\det(A)=2(3)-1(5)=1",
          note: "The determinant is nonzero, so the inverse exists.",
        },
        {
          latex:
            "A^{-1}=\\frac{1}{1}\\begin{bmatrix}3&-1\\\\-5&2\\end{bmatrix}",
          note: "Apply the 2 × 2 inverse formula.",
        },
        {
          latex:
            "AA^{-1}=\\begin{bmatrix}1&0\\\\0&1\\end{bmatrix}",
          note: "Multiply to confirm the identity matrix.",
        },
      ],
      answer: "The inverse has rows [3, -1] and [-5, 2].",
    },
    mistakes: [
      {
        title: "Taking entrywise reciprocals",
        description:
          "A matrix inverse is not found by replacing each entry with its reciprocal.",
      },
      {
        title: "Dividing by a zero determinant",
        description:
          "A singular matrix has no ordinary inverse, so the method must stop rather than divide by zero.",
      },
      {
        title: "Changing only half the augmented matrix",
        description:
          "Every row operation applied to A must also be applied to the identity side.",
      },
    ],
    faqs: [
      {
        question: "Does every square matrix have an inverse?",
        answer:
          "No. An ordinary inverse exists exactly when the determinant is nonzero.",
      },
      {
        question: "How can I check an inverse?",
        answer:
          "Multiply A and A⁻¹ in either order and confirm that the result is the identity matrix.",
      },
      {
        question: "Why can an inverse contain fractions?",
        answer:
          "Row operations and division by the determinant naturally produce rational entries.",
      },
      {
        question: "Is (AB)⁻¹ equal to A⁻¹B⁻¹?",
        answer:
          "No. The order reverses: (AB)⁻¹ = B⁻¹A⁻¹.",
      },
    ],
    related: ["determinant", "matrix", "systems-of-equations", "eigenvalue"],
  },
  {
    slug: "eigenvalue",
    name: "Eigenvalue Calculator",
    category: "Linear Algebra",
    seoTitle: "Eigenvalue Calculator with Steps",
    description:
      "Find matrix eigenvalues and eigenvectors with clear steps. See the characteristic polynomial, eigenspaces, exact or decimal values, and verification.",
    keywords: [
      "eigenvalue calculator",
      "eigenvalue calculator with steps",
      "eigenvalues and eigenvectors calculator",
      "characteristic polynomial calculator",
    ],
    heading: "Eigenvalue and Eigenvector Calculator",
    heroDescription:
      "Find the characteristic polynomial, eigenvalues, and eigenspaces of a square matrix.",
    placeholder:
      "Enter a square matrix, such as eigenvalues([[4,1],[2,3]])",
    inputHint: matrixInputHint,
    solverInstruction:
      "Find the eigenvalues and requested eigenvectors of the supplied square matrix. Parse entries exactly, form det(A minus lambda I), show the characteristic polynomial with multiplicities, solve each null space without using the zero vector, preserve exact values when possible, and verify short eigenpairs with Av equals lambda v.",
    examples: [
      {
        label: "2 × 2 eigenpairs",
        expression: "eigenvalues and eigenvectors of [[4,1],[2,3]]",
      },
      {
        label: "Repeated eigenvalue",
        expression: "find eigenvalues of [[2,1],[0,2]]",
      },
      {
        label: "Diagonal matrix",
        expression: "find eigenvalues and eigenvectors of [[3,0,0],[0,-1,0],[0,0,5]]",
      },
    ],
    overview: {
      heading: "Eigenvectors keep their direction under a matrix",
      paragraphs: [
        "An eigenvector is a nonzero vector whose direction is preserved by the matrix transformation, apart from a possible reversal. Its eigenvalue is the scalar factor in Av = λv.",
        "Eigenvalues come from the roots of det(A - λI). For each root, solve the null space of A - λI to find the eigenspace. Repeated roots need extra care because algebraic multiplicity does not guarantee the same number of independent eigenvectors.",
      ],
    },
    formula: {
      title: "The characteristic equation",
      latex:
        "\\det(A-\\lambda I)=0",
      explanation:
        "Values of λ that make A - λI singular are the eigenvalues. Their nonzero null-space vectors are the corresponding eigenvectors.",
    },
    methods: [
      {
        title: "Build the characteristic polynomial",
        description:
          "Subtract λ from the diagonal entries, calculate the determinant, and keep repeated factors visible.",
      },
      {
        title: "Solve each eigenspace",
        description:
          "For every eigenvalue, row reduce A - λI and describe all nonzero vectors in its null space.",
      },
      {
        title: "Check multiplicity and verification",
        description:
          "Compare algebraic and geometric multiplicities, then verify representative vectors with Av = λv.",
      },
    ],
    workedExample: {
      problem: "Find the eigenvalues and eigenvectors of A",
      steps: [
        {
          latex:
            "A=\\begin{bmatrix}4&1\\\\2&3\\end{bmatrix},\\quad \\det(A-\\lambda I)=(4-\\lambda)(3-\\lambda)-2",
          note: "Form the characteristic determinant.",
        },
        {
          latex:
            "\\lambda^2-7\\lambda+10=(\\lambda-5)(\\lambda-2)",
          note: "Factor the characteristic polynomial.",
        },
        {
          latex:
            "\\lambda=5:\\ v_1=\\begin{bmatrix}1\\\\1\\end{bmatrix},\\qquad \\lambda=2:\\ v_2=\\begin{bmatrix}1\\\\-2\\end{bmatrix}",
          note: "Solve each null space for a representative eigenvector.",
        },
        {
          latex:
            "Av_1=5v_1,\\qquad Av_2=2v_2",
          note: "Verify both eigenpairs.",
        },
      ],
      answer: "The eigenvalues are 5 and 2, with eigendirections spanned by [1, 1] and [1, -2].",
    },
    mistakes: [
      {
        title: "Stopping at the determinant",
        description:
          "Eigenvalues are the roots of the characteristic equation, not the determinant expression itself.",
      },
      {
        title: "Using the zero vector",
        description:
          "The zero vector always satisfies Av = λv but is excluded from the definition of an eigenvector.",
      },
      {
        title: "Ignoring repeated-root geometry",
        description:
          "A repeated eigenvalue may have fewer independent eigenvectors than its algebraic multiplicity.",
      },
    ],
    faqs: [
      {
        question: "What is an eigenvalue?",
        answer:
          "It is the scalar by which a matrix scales a nonzero eigenvector without changing that vector's line of direction.",
      },
      {
        question: "Are eigenvectors unique?",
        answer:
          "No. Any nonzero scalar multiple of an eigenvector lies in the same eigendirection.",
      },
      {
        question: "Can a real matrix have complex eigenvalues?",
        answer:
          "Yes. A real matrix can have complex conjugate eigenvalue pairs.",
      },
      {
        question: "Is every square matrix diagonalizable?",
        answer:
          "No. Diagonalization requires enough linearly independent eigenvectors to form a basis.",
      },
    ],
    related: ["matrix", "determinant", "matrix-inverse", "polynomial"],
  },
  {
    slug: "dot-product",
    name: "Dot Product Calculator",
    category: "Linear Algebra",
    seoTitle: "Dot Product Calculator with Steps",
    description:
      "Calculate the dot product of two vectors with clear steps. Find the angle, test orthogonality, and see scalar or vector projections from components.",
    keywords: [
      "dot product calculator",
      "vector dot product calculator",
      "dot product calculator with steps",
      "angle between vectors calculator",
    ],
    heading: "Dot Product Calculator",
    heroDescription:
      "Multiply matching vector components, add them, and use the scalar result to study angle or projection.",
    placeholder:
      "Enter two vectors, such as dot([1,2,2],[2,1,-2])",
    inputHint: vectorInputHint,
    solverInstruction:
      "Calculate the requested dot product for two vectors of equal dimension. Parse components exactly, reject mismatched dimensions, show each component product and their sum, return a scalar, and handle angle or projection requests only when the required vectors are nonzero.",
    examples: [
      {
        label: "Orthogonal vectors",
        expression: "dot([1,2,2],[2,1,-2])",
      },
      {
        label: "Angle between vectors",
        expression: "find the angle between [1,0,1] and [0,1,1]",
      },
      {
        label: "Vector projection",
        expression: "project [3,4] onto [1,2] using the dot product",
      },
    ],
    overview: {
      heading: "The dot product turns two vectors into a scalar",
      paragraphs: [
        "In component form, multiply corresponding entries and add the products. The vectors must have the same dimension, and the result is one number rather than another vector.",
        "The geometric form connects that scalar to the angle between nonzero vectors. A zero dot product means two nonzero real vectors are perpendicular, while projection uses the dot product to measure how much one vector points along another.",
      ],
    },
    formula: {
      title: "Component form of the dot product",
      latex:
        "\\mathbf{a}\\cdot\\mathbf{b}=\\sum_{i=1}^{n}a_i b_i",
      explanation:
        "Multiply components in matching positions and add those products to obtain a scalar.",
    },
    methods: [
      {
        title: "Check equal dimensions",
        description:
          "Both vectors need the same number of components in the same coordinate order.",
      },
      {
        title: "Multiply and add",
        description:
          "Write every component product, keep its sign, and sum the results once.",
      },
      {
        title: "Interpret only when defined",
        description:
          "Angle and projection formulas that divide by a magnitude require the relevant vectors to be nonzero.",
      },
    ],
    workedExample: {
      problem: "Find the dot product and angle",
      steps: [
        {
          latex:
            "\\mathbf{a}=\\begin{bmatrix}1\\\\2\\\\2\\end{bmatrix},\\quad \\mathbf{b}=\\begin{bmatrix}2\\\\1\\\\-2\\end{bmatrix}",
          note: "Both vectors have three components.",
        },
        {
          latex:
            "\\mathbf{a}\\cdot\\mathbf{b}=1(2)+2(1)+2(-2)=0",
          note: "Multiply corresponding components and add.",
        },
        {
          latex:
            "\\cos\\theta=\\frac{0}{\\|\\mathbf{a}\\|\\|\\mathbf{b}\\|}=0",
          note: "Both vectors are nonzero, so the angle formula applies.",
        },
        {
          latex: "\\theta=90^\\circ",
          note: "A cosine of zero gives a right angle.",
        },
      ],
      answer: "The dot product is 0, so the two nonzero vectors are perpendicular.",
    },
    mistakes: [
      {
        title: "Using different vector dimensions",
        description:
          "The component dot product requires the same number of entries in both vectors.",
      },
      {
        title: "Returning a vector",
        description:
          "A dot product is a scalar. A perpendicular vector is associated with the cross product.",
      },
      {
        title: "Dividing by a zero magnitude",
        description:
          "The zero vector has no direction, so its angle and normalized projection formulas are undefined.",
      },
    ],
    faqs: [
      {
        question: "Is the dot product a vector?",
        answer:
          "No. The result is a scalar.",
      },
      {
        question: "What does a zero dot product mean?",
        answer:
          "For two nonzero real vectors, it means they are perpendicular. If one vector is zero, the angle is undefined.",
      },
      {
        question: "How do I find the angle between vectors?",
        answer:
          "Divide the dot product by the product of the magnitudes, then take arccos.",
      },
      {
        question: "Can a dot product be negative?",
        answer:
          "Yes. For nonzero real vectors, a negative dot product corresponds to an obtuse angle.",
      },
    ],
    related: ["cross-product", "matrix", "slope", "distance-formula"],
  },
  {
    slug: "cross-product",
    name: "Cross Product Calculator",
    category: "Linear Algebra",
    seoTitle: "Cross Product Calculator with Steps",
    description:
      "Calculate the 3D cross product of two vectors with clear steps. See the perpendicular vector, magnitude, direction, and parallelogram or triangle area.",
    keywords: [
      "cross product calculator",
      "vector cross product calculator",
      "cross product calculator with steps",
      "3d vector cross product",
    ],
    heading: "Cross Product Calculator",
    heroDescription:
      "Find the oriented vector perpendicular to two 3D vectors, then check its magnitude and direction.",
    placeholder:
      "Enter two 3D vectors, such as cross([2,3,4],[1,-2,2])",
    inputHint: vectorInputHint,
    solverInstruction:
      "Calculate the ordered cross product of two three-dimensional real vectors. Parse exactly three components per vector, reject incompatible dimensions, preserve the first-cross-second orientation and middle-component sign, return a vector, and verify perpendicularity with dot products when reasonably short.",
    examples: [
      {
        label: "3D vectors",
        expression: "cross([2,3,4],[1,-2,2])",
      },
      {
        label: "Coordinate axes",
        expression: "cross([2,0,0],[0,3,0])",
      },
      {
        label: "Triangle area",
        expression: "find triangle area from vectors [1,2,0] and [3,0,1]",
      },
    ],
    overview: {
      heading: "The cross product keeps direction and orientation",
      paragraphs: [
        "The standard cross product takes two 3D real vectors and returns a vector perpendicular to both. Its direction follows the right-hand rule, so reversing the input order reverses the sign.",
        "The magnitude equals the area of the parallelogram spanned by the vectors. Half of that magnitude gives the corresponding triangle area. Parallel vectors have a zero cross product and no unique unit normal.",
      ],
    },
    formula: {
      title: "Component form of the cross product",
      latex:
        "\\mathbf{a}\\times\\mathbf{b}=\\begin{bmatrix}a_2b_3-a_3b_2\\\\a_3b_1-a_1b_3\\\\a_1b_2-a_2b_1\\end{bmatrix}",
      explanation:
        "Compute the three signed component differences in order. Swapping the vectors negates the result.",
    },
    methods: [
      {
        title: "Keep the vector order visible",
        description:
          "Write a × b before expanding because b × a points in the opposite direction.",
      },
      {
        title: "Protect the middle sign",
        description:
          "Use the component formula carefully so the second coordinate is not given the wrong sign.",
      },
      {
        title: "Check perpendicularity",
        description:
          "Dot the result with each input vector. Both checks should equal zero.",
      },
    ],
    workedExample: {
      problem: "Find a × b",
      steps: [
        {
          latex:
            "\\mathbf{a}=\\begin{bmatrix}2\\\\3\\\\4\\end{bmatrix},\\quad \\mathbf{b}=\\begin{bmatrix}1\\\\-2\\\\2\\end{bmatrix}",
          note: "Keep the first-cross-second order fixed.",
        },
        {
          latex:
            "\\mathbf{a}\\times\\mathbf{b}=\\begin{bmatrix}3(2)-4(-2)\\\\4(1)-2(2)\\\\2(-2)-3(1)\\end{bmatrix}=\\begin{bmatrix}14\\\\0\\\\-7\\end{bmatrix}",
          note: "Compute each signed component.",
        },
        {
          latex:
            "\\begin{bmatrix}14\\\\0\\\\-7\\end{bmatrix}\\cdot\\mathbf{a}=0,\\quad \\begin{bmatrix}14\\\\0\\\\-7\\end{bmatrix}\\cdot\\mathbf{b}=0",
          note: "Verify the result is perpendicular to both inputs.",
        },
        {
          latex:
            "\\|\\mathbf{a}\\times\\mathbf{b}\\|=\\sqrt{14^2+(-7)^2}=7\\sqrt{5}",
          note: "The magnitude is the parallelogram area.",
        },
      ],
      answer: "The cross product is [14, 0, -7], and its magnitude is 7√5.",
    },
    mistakes: [
      {
        title: "Reversing the order silently",
        description:
          "Swapping the vectors negates the cross product, so the original orientation must stay visible.",
      },
      {
        title: "Losing the middle sign",
        description:
          "The second component is a₃b₁ - a₁b₃ in the direct component formula.",
      },
      {
        title: "Returning a scalar",
        description:
          "A cross product returns a perpendicular vector. A scalar result belongs to the dot product.",
      },
    ],
    faqs: [
      {
        question: "Is the cross product a scalar or a vector?",
        answer:
          "It is a vector perpendicular to both input vectors in the standard 3D setting.",
      },
      {
        question: "How is its direction chosen?",
        answer:
          "Use the right-hand rule from the first vector toward the second.",
      },
      {
        question: "Why can the cross product be zero?",
        answer:
          "The vectors are parallel, antiparallel, or one of them is the zero vector.",
      },
      {
        question: "Can I use 2D vectors?",
        answer:
          "They can be embedded as [x, y, 0]. The result then has only a signed z component.",
      },
    ],
    related: ["dot-product", "determinant", "matrix", "distance-formula"],
  },
] satisfies CalculatorDefinition[];
