import { twMerge } from "tailwind-merge";
import { useCallback, useId, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export type TabsNavigationState = {
  tab?: number;
};

export type Tab = {
  id: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  content: React.ReactNode;
};

export type TabsProps = Omit<React.HTMLProps<HTMLDivElement>, "children"> & {
  children: Tab[];
};

export const Tabs: React.FC<TabsProps> = ({ children: tabs, ...props }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<number>(location?.state?.tab ?? 0);

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
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={index === activeTab}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onClickTab(index)}
            className={twMerge(
              "text-zinc-50 flex-1 text-center my-2 pt-2 active:bg-zinc-600 first:rounded-tl-md last:rounded-tr-md"
            )}
          >
            <div
              className={twMerge(
                "mb-2 flex flex-1 justify-center gap-2 items-center pt-2",
                index === activeTab && "text-emerald-400"
              )}
            >
              {tab.icon(index === activeTab)}
              {tab.label}
            </div>
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
      <div
        role="tabpanel"
        className="contents"
        id={`tabpanel-${tabs[activeTab].id}`}
        aria-labelledby={`tab-${tabs[activeTab].id}}`}
      >
        {tabs[activeTab].content}
      </div>
    </div>
  );
};
