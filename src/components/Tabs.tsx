import { twMerge } from "tailwind-merge";
import React from "react";
export type TabsProps = Omit<React.HTMLProps<HTMLDivElement>, "children"> & {
  children: Record<string, React.ReactNode>;
};

export const Tabs: React.FC<TabsProps> = ({ children, ...props }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  return (
    <div
      {...props}
      className={twMerge("flex flex-col flex-1", props.className)}
    >
      <nav role="tablist" className="flex gap-4 max-w-full py-2">
        {Object.keys(children).map((key, index) => (
          <button
            key={key}
            role="tab"
            aria-selected={index === activeTab}
            aria-controls={`panel-${key}`}
            onClick={() => setActiveTab(index)}
            className={twMerge(
              "text-zinc-50 flex-1 text-center py-2 px-4",
              index === activeTab &&
                "text-emerald-400 border-b border-b-emerald-400 "
            )}
          >
            {key}
          </button>
        ))}
      </nav>
      <div role="tabpanel" className="flex-1 flex flex-col">
        {Object.values(children)[activeTab]}
      </div>
    </div>
  );
};
