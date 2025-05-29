import { twMerge } from "tailwind-merge";
import { useCallback, useId, useState } from "react";
import { ComponentParts } from "./parts";
import { useLocation, useRouter } from "@tanstack/react-router";

export type TabsNavigationState = {
  tab?: number;
};

declare module "@tanstack/react-router" {
  interface HistoryState {
    tabHistory?: Record<string, TabsNavigationState>;
  }
}

export type TabContent = {
  type: "content";
  id: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  content: React.ReactNode;
};

export type TabButton = {
  type: "action";
  id: string;
  content: React.ReactNode;
};

export type Tab = TabContent | TabButton;

export type TabParts = ComponentParts<{
  tab: React.HTMLProps<HTMLDivElement>;
  tablist: React.HTMLProps<HTMLDivElement>;
  tabpanel: React.HTMLProps<HTMLDivElement>;
}>;

export type TabsProps = Omit<React.HTMLProps<HTMLDivElement>, "children"> & {
  children: Tab[];
} & TabParts;

export const Tabs: React.FC<TabsProps> = ({
  children: tabs,
  parts,
  ...props
}) => {
  const id = useId();
  const router = useRouter();
  const location = useLocation();

  const contentTabs = tabs.filter((tab) => tab.type === "content");
  const buttonTabs = tabs.filter((tab) => tab.type === "action");

  const [activeTab, setActiveTab] = useState<number>(
    location?.state?.tabHistory?.[id]?.tab ?? 0
  );

  const onClickTab = useCallback(
    (index: number) => {
      router.navigate({
        state: (state) => ({
          ...state,
          tabHistory: { ...state.tabHistory, [id]: { tab: index } },
        }),
      });
      setActiveTab(index);
    },
    [id, router]
  );

  return (
    <div {...props} className={twMerge("contents", props.className)}>
      <nav
        role="tablist"
        {...parts?.tablist}
        className={twMerge("flex max-w-full pt-2", parts?.tablist?.className)}
      >
        {buttonTabs.map((tab) => tab.content)}
        {contentTabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={index === activeTab}
            aria-controls={`tabpanel-${tab.id}`}
            aria-label={tab.label}
            aria-posinset={index + 1}
            id={`tab-${tab.id}`}
            onClick={() => onClickTab(index)}
            data-selected={index === activeTab}
            data-index={index}
            className={twMerge(
              "text-zinc-50 flex-1 text-center active:bg-zinc-600 first:rounded-tl-md last:rounded-tr-md"
            )}
          >
            <div
              data-selected={index === activeTab}
              data-index={index}
              {...parts?.tab}
              className={twMerge(
                "flex flex-1 justify-center gap-2 items-center py-4 data-[selected=true]:text-emerald-400 data-[selected=true]:border-b-4 data-[selected=true]:border-emerald-400",
                parts?.tab?.className
              )}
            >
              {tab.icon(index === activeTab)}
              {tab.label}
            </div>
          </button>
        ))}
      </nav>
      <div
        role="tabpanel"
        id={`tabpanel-${tabs[activeTab].id}`}
        aria-labelledby={`tab-${tabs[activeTab].id}}`}
        {...parts?.tabpanel}
        className={twMerge("contents", parts?.tabpanel?.className)}
      >
        {contentTabs[activeTab].content}
      </div>
    </div>
  );
};
