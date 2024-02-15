import { twMerge } from "tailwind-merge";
import { useCallback, useId, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDrag } from "@use-gesture/react";

export type TabsNavigationState = {
  tab?: number;
};

export type TabsProps = Omit<React.HTMLProps<HTMLDivElement>, "children"> & {
  children: Record<string, React.ReactNode>;
};

export const Tabs: React.FC<TabsProps> = ({ children, ...props }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = useMemo(() => Object.entries(children), []);

  const [activeTab, setActiveTab] = useState<number>(location?.state?.tab ?? 0);
  const bind = useDrag(
    ({ direction, first }) => {
      if (!first) return;
      if (direction[0] > 0) {
        setActiveTab((t) => Math.max(0, t - 1));
      } else if (direction[0] < 0) {
        setActiveTab((t) => Math.min(tabs.length - 1, t + 1));
      }
    },
    { axis: "x", threshold: 1 }
  );

  const onClickTab = useCallback(
    (index: number) => {
      const state: TabsNavigationState = { tab: index };
      navigate(location, { replace: true, state });
      setActiveTab(index);
    },
    [location, navigate]
  );

  const tabLayoutId = useId();

  return (
    <div
      {...props}
      className={twMerge("flex flex-col flex-1", props.className)}
    >
      <nav role="tablist" className="flex max-w-full pt-2">
        {tabs.map(([key], index) => (
          <button
            key={key}
            role="tab"
            aria-selected={index === activeTab}
            aria-controls={`panel-${key}`}
            onClick={() => onClickTab(index)}
            className={twMerge(
              "text-zinc-50 flex-1 text-center my-2 pt-2 active:bg-zinc-600 first:rounded-tl-md last:rounded-tr-md"
            )}
          >
            <div className="mb-2">{key}</div>
            {index === activeTab && (
              <motion.div
                layoutId={tabLayoutId}
                transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                className="h-1 w-full bg-emerald-400"
              ></motion.div>
            )}
          </button>
        ))}
      </nav>
      <div role="tabpanel" className="contents touch-none" {...bind()}>
        {tabs[activeTab][1]}
      </div>
    </div>
  );
};
