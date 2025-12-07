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

export const FloatingParticle: React.FC<{
  delay: number;
  duration: number;
  size: number;
  initialX: number;
  initialY: number;
}> = ({ delay, duration, size, initialX, initialY }) => {
  return (
    <m.div
      className="absolute rounded-full bg-gradient-to-br from-emerald-400/30 to-purple-400/20 blur-sm"
      style={{
        width: size,
        height: size,
        left: `${initialX}%`,
        top: `${initialY}%`,
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, -15, 0],
        scale: [1, 1.2, 0.9, 1],
        opacity: [0.3, 0.6, 0.3],
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
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        delay: Math.random() * 2,
        duration: 4 + Math.random() * 3,
        size: 10 + Math.random() * 40,
        initialX: Math.random() * 100,
        initialY: Math.random() * 100,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <m.div
        className="absolute inset-0 bg-zinc-800"
        animate={{
          background: [
            "linear-gradient(135deg, rgb(39, 39, 42) 0%, rgb(39, 39, 42) 50%, rgb(39, 39, 42) 100%)",
            "linear-gradient(135deg, rgb(39, 39, 42) 0%, rgb(6, 78, 59) 50%, rgb(39, 39, 42) 100%)",
            "linear-gradient(135deg, rgb(39, 39, 42) 0%, rgb(39, 39, 42) 50%, rgb(39, 39, 42) 100%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {particles.map((particle) => (
        <FloatingParticle key={particle.id} {...particle} />
      ))}

      <m.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
        }}
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

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
