import type { Metadata } from "next";
import VideoLibraryPage from "@/components/video/VideoLibraryPage";

export const metadata: Metadata = {
  title: "Video Library - MathSolver",
  description:
    "Rewatch your private, step-by-step MathSolver video explanations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VideoLibraryRoute() {
  return (
    <div className="h-full w-full bg-background">
      <VideoLibraryPage />
    </div>
  );
}
