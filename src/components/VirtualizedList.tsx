import {
  PartialKeys,
  useVirtualizer,
  VirtualizerOptions,
} from "@tanstack/react-virtual";
import { useRef } from "react";
import { twMerge } from "tailwind-merge";

type UseVirtualizerOptions = PartialKeys<
  VirtualizerOptions<HTMLDivElement, HTMLDivElement>,
  "observeElementRect" | "observeElementOffset" | "scrollToFn"
>;

export type VirtualizedListProps<T> = {
  data?: T[];
  children: (value: T, index: number) => React.ReactNode;
  options: Omit<UseVirtualizerOptions, "getScrollElement" | "count">;
} & Omit<React.HTMLProps<HTMLDivElement>, "ref" | "data" | "children">;

export const VirtualizedList = <T,>({
  data,
  children,
  options,
  ...props
}: VirtualizedListProps<T>) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    getScrollElement: () => parentRef.current,
    count: data?.length ?? 0,
    ...options,
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      {...props}
      className={twMerge(props.className, "overflow-auto")}
      ref={parentRef}
    >
      <div style={{ width: "100%", height: totalSize, position: "relative" }}>
        {data
          ? items.map(({ index, start, size }) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${size}px`,
                  transform: `translateY(${start}px)`,
                }}
              >
                {children(data[index], index)}
              </div>
            ))
          : null}
      </div>
    </div>
  );
};
