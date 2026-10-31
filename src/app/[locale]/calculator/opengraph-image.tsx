import { ImageResponse } from "next/og";
import { calculatorDefinitions } from "@/lib/calculators";

export const alt = "MathSolver math calculators with step-by-step solutions";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
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

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              maxWidth: 980,
              fontSize: 72,
              lineHeight: 1.04,
              letterSpacing: "-2.5px",
              fontWeight: 800,
            }}
          >
            Free math calculators with steps
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 920,
              fontSize: 28,
              lineHeight: 1.4,
              color: "#475569",
            }}
          >
            Equations, graphs, statistics, matrices, and more.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#475569",
            fontSize: 23,
          }}
        >
          <span>{calculatorDefinitions.length} focused calculators</span>
          <span>math-solver.io</span>
        </div>
      </div>
    ),
    size,
  );
}
