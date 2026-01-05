import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { m } from "motion/react";
import { useMemo } from "react";
import { IconButton } from "~components/Button";
import { Sparkle } from "~components/WrappedPrompt";

export const FloatingParticle: React.FC<{
  delay: number;
  duration: number;
  size: number;
  initialX: number;
  initialY: number;
}> = ({ delay, duration, size, initialX, initialY }) => {
  return (
    <m.div
      className="absolute rounded-full bg-gradient-to-br from-emerald-500/15 to-emerald-400/5 blur-md"
      style={{
        width: size,
        height: size,
        left: `${initialX}%`,
        top: `${initialY}%`,
      }}
      animate={{
        y: [0, -40, 0],
        x: [0, 20, -20, 0],
        scale: [1, 1.3, 0.8, 1],
        opacity: [0.1, 0.3, 0.1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

export const AnimatedBackground: React.FC = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        delay: Math.random() * 4,
        duration: 8 + Math.random() * 6,
        size: 40 + Math.random() * 80,
        initialX: Math.random() * 100,
        initialY: Math.random() * 100,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base dark background */}
      <div className="absolute inset-0 bg-zinc-900" />

      {/* Aurora effect - slow sweeping gradient at the top */}
      <m.div
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(180deg, rgba(16, 185, 129, 0.03) 0%, transparent 30%, transparent 100%)",
            "linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.04) 25%, transparent 50%, transparent 100%)",
            "linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, transparent 20%, transparent 100%)",
            "linear-gradient(180deg, rgba(16, 185, 129, 0.03) 0%, transparent 30%, transparent 100%)",
          ],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary aurora wave */}
      <m.div
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(160deg, transparent 0%, transparent 60%, rgba(16, 185, 129, 0.02) 80%, transparent 100%)",
            "linear-gradient(160deg, transparent 0%, rgba(6, 78, 59, 0.05) 40%, rgba(16, 185, 129, 0.06) 60%, transparent 100%)",
            "linear-gradient(160deg, transparent 0%, transparent 50%, rgba(16, 185, 129, 0.03) 70%, transparent 100%)",
            "linear-gradient(160deg, transparent 0%, transparent 60%, rgba(16, 185, 129, 0.02) 80%, transparent 100%)",
          ],
        }}
        transition={{
          duration: 15,
          delay: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating particles - subtle glowing orbs */}
      {particles.map((particle) => (
        <FloatingParticle key={particle.id} {...particle} />
      ))}

      {/* Subtle center glow */}
      <m.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(16, 185, 129, 0.04) 0%, transparent 40%)",
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

export const WrappedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnSlide = location.pathname.includes("/wrapped/2025-2026/");

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

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <AnimatedBackground />
      {!isOnSlide && (
        <nav className="absolute top-0 left-0 p-4 h-16 flex gap-4 max-w-full z-10">
          <IconButton
            onClick={() => navigate({ to: "/" })}
            icon={<ChevronLeftIcon height={24} />}
            className="aspect-auto bg-transparent"
            aria-label="Back"
          />
        </nav>
      )}
      {sparkles.map((sparkle) => (
        <Sparkle key={sparkle.id} {...sparkle} />
      ))}
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute("/wrapped")({
  component: WrappedPage,
});
