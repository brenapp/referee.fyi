import { m } from "motion/react";
import { createFileRoute } from "@tanstack/react-router";
import { LinkButton } from "~components/Button";
import { PlayIcon } from "@heroicons/react/20/solid";

const icon168 = new URL(
  "/icons/referee-fyi-168x168.png",
  import.meta.url
).toString();
const icon192 = new URL(
  "/icons/referee-fyi-192x192.png",
  import.meta.url
).toString();
const icon256 = new URL(
  "/icons/referee-fyi-256x256.png",
  import.meta.url
).toString();
const icon512 = new URL(
  "/icons/referee-fyi-512x512.png",
  import.meta.url
).toString();

const AppIcon: React.FC = () => {
  return (
    <picture>
      <source srcSet={icon512} media="(min-width: 512px)" />
      <source srcSet={icon256} media="(min-width: 256px)" />
      <source srcSet={icon192} media="(min-width: 192px)" />
      <img
        src={icon168}
        alt="Referee FYI Logo"
        className="w-32 h-32 md:w-48 md:h-48 rounded-lg"
      />
    </picture>
  );
};

const AnimatedIntro: React.FC = () => {
  const titleWords = ["Referee", "FYI"];
  const subtitleWords = ["Wrapped"];

  return (
    <div className="text-center">
      <div className="flex justify-center gap-4 mb-2">
        {titleWords.map((word, index) => (
          <m.span
            key={word}
            className="text-5xl md:text-7xl font-bold text-white"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.2,
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </m.span>
        ))}
      </div>
      {subtitleWords.map((word, index) => (
        <m.span
          key={word}
          className="text-6xl md:text-8xl font-black bg-gradient-to-r from-emerald-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.6 + index * 0.15,
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            backgroundSize: "200% 100%",
          }}
        >
          <m.span
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
            className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent"
            style={{
              backgroundSize: "200% 100%",
            }}
          >
            {word}
          </m.span>
        </m.span>
      ))}
    </div>
  );
};

export const WrappedIndexPage: React.FC = () => {
  return (
    <div className="relative z-10 flex flex-col items-center gap-12 px-6">
      <AppIcon />
      <AnimatedIntro />
      <m.p
        className="text-zinc-200 text-lg md:text-xl text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        Get an overview of your refereeing this season.
      </m.p>
      <LinkButton
        className="flex items-center p-4 mt-8 w-full justify-center bg-emerald-900/40 border-2 border-emerald-500 hover:bg-emerald-500/10 focus:bg-emerald-500/10 transition-colors"
        to={"/wrapped/2025-2026/1"}
      >
        <PlayIcon className="w-5 h-5 mr-2" />
        Start
      </LinkButton>
    </div>
  );
};

export const Route = createFileRoute("/wrapped/")({
  component: WrappedIndexPage,
});
