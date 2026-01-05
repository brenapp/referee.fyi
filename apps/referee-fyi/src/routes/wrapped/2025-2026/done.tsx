import { m, AnimatePresence } from "motion/react";
import { createFileRoute } from "@tanstack/react-router";
import { WrappedNav } from "../-components";
import { ScaleIcon } from "@heroicons/react/24/solid";

export const Done: React.FC = () => {
  return (
    <AnimatePresence>
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-6 pt-16 pb-8 w-full min-h-screen">
        <WrappedNav
          backTo="/wrapped/2025-2026/3"
          nextTo="/"
          nextLabel="Done"
          current={4}
          total={4}
        />

        <m.div
          className="text-center flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <m.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
          >
            <ScaleIcon className="w-20 h-20 text-emerald-400" />
          </m.div>

          <m.h1
            className="text-4xl md:text-5xl font-bold text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Thank You!
          </m.h1>
          <m.p
            className="text-zinc-400 text-lg max-w-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            Thank you for all your effort volunteering at events this season.
            Your contributions are essential!
          </m.p>
        </m.div>
      </div>
    </AnimatePresence>
  );
};

export const Route = createFileRoute("/wrapped/2025-2026/done")({
  component: Done,
});
