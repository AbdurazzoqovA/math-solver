"use client";

import { useUI } from "@/context/UIContext";
import { Panel, Group, Separator } from "react-resizable-panels";
import PracticePanel from "@/components/practice/PracticePanel";
import { GripVertical } from "lucide-react";

export default function SplitLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isPracticePanelOpen } = useUI();

  if (!isPracticePanelOpen) {
    return <>{children}</>;
  }

  return (
    <Group orientation="horizontal" className="h-full w-full">
      <Panel defaultSize={60} minSize={30}>
        {children}
      </Panel>
      <Separator className="w-px bg-black/10 dark:bg-white/10 hover:bg-primary-500 active:bg-primary-500 transition-colors duration-200 focus:outline-none flex flex-col items-center justify-center relative cursor-col-resize z-20 group">
         {/* The pill shaped handle */}
         <div className="w-4 h-8 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-full flex items-center justify-center absolute shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:border-primary-500/50 group-active:scale-95 group-active:bg-zinc-100 dark:group-active:bg-zinc-700 z-30">
            <GripVertical className="w-3 h-3 text-muted-foreground/60 transition-colors group-hover:text-primary-500 group-active:text-primary-600" />
         </div>
      </Separator>
      <Panel defaultSize={40} minSize={30}>
        <div className="h-full w-full bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden shadow-black/5 dark:shadow-white/5">
           <PracticePanel />
        </div>
      </Panel>
    </Group>
  );
}
