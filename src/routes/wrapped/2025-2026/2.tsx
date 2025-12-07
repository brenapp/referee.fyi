import { AnimatePresence } from "motion/react";
import { createFileRoute } from "@tanstack/react-router";
import { WrappedNav } from "../-components";

export const Two: React.FC = () => {
  return (
    <AnimatePresence>
      <div className="relative z-10 flex flex-col gap-6 px-6 pt-16 pb-8 w-full">
        <WrappedNav
          backTo="/wrapped/2025-2026/1"
          nextTo="/wrapped/2025-2026/3"
          current={2}
          total={4}
        />
      </div>
    </AnimatePresence>
  );
};

export const Route = createFileRoute("/wrapped/2025-2026/2")({
  component: Two,
  loader: async () => {},
});
