import { m } from "motion/react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export type WrappedNavProps = {
  backTo: LinkProps["to"];
  backLabel?: string;
  nextTo: LinkProps["to"];
  nextLabel?: string;
  current: number;
  total: number;
};

export const WrappedNav: React.FC<WrappedNavProps> = ({
  backTo,
  backLabel = "Back",
  nextTo,
  nextLabel = "Next",
  current,
  total,
}) => {
  return (
    <m.nav
      className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-3"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link
        to={backTo}
        className="rounded-md bg-transparent text-zinc-100 px-2 py-1 flex items-center gap-1 hover:bg-zinc-700/50"
      >
        <ChevronLeftIcon className="w-5 h-5" />
        <span className="text-sm">{backLabel}</span>
      </Link>
      <span className="text-zinc-500 text-sm">
        {current} / {total}
      </span>
      <Link
        to={nextTo}
        className="rounded-md bg-emerald-600/80 text-zinc-100 px-2 py-1 flex items-center gap-1 hover:bg-emerald-500"
      >
        <span className="text-sm">{nextLabel}</span>
        <ChevronRightIcon className="w-5 h-5" />
      </Link>
    </m.nav>
  );
};
