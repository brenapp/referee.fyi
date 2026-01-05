import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { m } from "motion/react";
import { LinkButton } from "~components/Button";
import {
  getAuthoredIncidentsForPeriod,
  Period2025_2026,
} from "../routes/wrapped/-components";
import { useShareConnection } from "~models/ShareConnection";

export const Sparkle: React.FC<{
  delay: number;
  x: string;
  y: string;
  isPurple?: boolean;
}> = ({ delay, x, y, isPurple = false }) => {
  return (
    <m.div
      className={`absolute w-1 h-1 rounded-full ${isPurple ? "bg-purple-400" : "bg-emerald-400"}`}
      style={{ left: x, top: y }}
      animate={{
        scale: [0, 1, 0],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: 2,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

export type WrappedPromptProps = {
  hasVisitedEvent: boolean;
};

export const WrappedPrompt: React.FC<WrappedPromptProps> = ({
  hasVisitedEvent,
}) => {
  const { data: incidentData } = useQuery({
    queryKey: ["wrapped_incidents_count"],
    queryFn: () => getAuthoredIncidentsForPeriod(Period2025_2026),
  });

  const { profile } = useShareConnection(["profile"]);

  const sparkles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        delay: Math.random() * 3,
        x: `${15 + Math.random() * 70}%`,
        y: `${15 + Math.random() * 70}%`,
        isPurple: Math.random() < 0.15,
      })),
    []
  );

  const hasEnoughData = (incidentData?.authoredThisSeason.length ?? 0) >= 10;
  const isRegistered = !!profile.name;
  const show = hasVisitedEvent && hasEnoughData && isRegistered;

  if (!show) {
    return null;
  }

  return (
    <LinkButton
      to="/wrapped"
      className="mt-4 bg-zinc-900 p-4 rounded-md w-full justify-center relative"
    >
      {sparkles.map((sparkle) => (
        <Sparkle key={sparkle.id} {...sparkle} />
      ))}
      <h1 className="text-lg font-bold">
        Referee FYI Wrapped
        <ArrowRightIcon className="w-5 h-5 inline-block ml-2 text-emerald-400" />
      </h1>
      <p className="text-zinc-300">See an overview of your season so far.</p>
    </LinkButton>
  );
};
