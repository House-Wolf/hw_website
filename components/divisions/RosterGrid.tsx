import { Children, type ReactNode } from "react";

/** Keep all roster pages centered, including incomplete final rows. */
export function RosterGrid({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-6">
      {Children.map(children, (child) => (
        <div className="w-full min-w-0 sm:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)]">
          {child}
        </div>
      ))}
    </div>
  );
}
