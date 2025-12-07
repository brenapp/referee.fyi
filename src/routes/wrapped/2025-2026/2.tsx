import { m, AnimatePresence } from "motion/react";
import { createFileRoute } from "@tanstack/react-router";
import { LinkButton } from "~components/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export const Two: React.FC = () => {
  return (
    <AnimatePresence>
      <div className="relative z-10 flex flex-col gap-6 px-6 pt-16 pb-8 w-full">
        <m.nav
          className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <LinkButton
            to="/wrapped/2025-2026/1"
            className="flex items-center gap-1 bg-transparent hover:bg-zinc-700/50 px-2 py-1"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </LinkButton>
          <span className="text-zinc-500 text-sm">2 / 2</span>
          <LinkButton
            to="/"
            className="flex items-center gap-1 bg-emerald-600/80 hover:bg-emerald-500 px-2 py-1"
          >
            <span className="text-sm">Finish</span>
            <ChevronRightIcon className="w-5 h-5" />
          </LinkButton>
        </m.nav>

        <m.div
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <m.h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Coming Soon
          </m.h1>
          <m.p
            className="text-zinc-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            More soon!
          </m.p>
        </m.div>
      </div>
    </AnimatePresence>
  );
};

export const Route = createFileRoute("/wrapped/2025-2026/2")({
  component: Two,
  loader: async () => {},
});
