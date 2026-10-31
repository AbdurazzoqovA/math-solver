import { ImageResponse } from "next/og";
import { getCalculator } from "@/lib/calculators";

export const alt = "MathSolver calculator with step-by-step solutions";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const calculator = getCalculator(slug);

  const name = calculator?.name ?? "Math Calculator";
  const example = calculator?.examples[0]?.expression;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 82px",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                background: "#2563eb",
                color: "#eff6ff",
                fontSize: 30,
              }}
            >
              M
            </div>
            MathSolver
          </div>
          <div
            style={{
              display: "flex",
              border: "1px solid #bfdbfe",
              borderRadius: 14,
              background: "#eff6ff",
              color: "#1d4ed8",
              padding: "12px 18px",
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {calculator?.category ?? "Math"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              maxWidth: 980,
              fontSize: 68,
              lineHeight: 1.04,
              letterSpacing: "-2.5px",
              fontWeight: 800,
            }}
          >
            {name}
          </div>
          {example ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: 82,
                maxWidth: 950,
                borderLeft: "6px solid #2563eb",
                paddingLeft: 24,
                fontFamily: "monospace",
                fontSize:
                  example.length > 70 ? 22 : example.length > 45 ? 25 : 29,
                lineHeight: 1.3,
                overflowWrap: "anywhere",
                color: "#334155",
              }}
            >
              {example}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#475569",
            fontSize: 23,
          }}
        >
          <span>Free step-by-step solutions</span>
          <span>math-solver.io</span>
        </div>
      </div>
    ),
    size,
  );
}
