"use client";

import React, { PropsWithChildren, useRef } from "react";
import {
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

export interface DockProps {
  className?: string;
  direction?: "top" | "middle" | "bottom";
  children: React.ReactNode;
}

const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;
const DEFAULT_PANEL_HEIGHT = 64;

export function Dock({
  children,
  className,
  direction = "middle",
}: DockProps) {
  const mouseX = useMotionValue(Infinity);

  const renderChildren = () => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement<DockItemProps>(child) && child.type === DockItem) {
        return React.cloneElement(child, {
          mouseX,
          magnification: child.props.magnification ?? DEFAULT_MAGNIFICATION,
          distance: child.props.distance ?? DEFAULT_DISTANCE,
        });
      }
      return child;
    });
  };

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "flex h-[58px] items-end gap-2 rounded-2xl border border-white/[0.08] bg-black/60 px-2 pb-2 backdrop-blur-2xl",
        {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        },
        className
      )}
      role="toolbar"
      aria-label="Application Dock"
    >
      {renderChildren()}
    </motion.div>
  );
}

export interface DockItemProps {
  className?: string;
  children: React.ReactNode;
  magnification?: number;
  distance?: number;
  mouseX?: MotionValue<number>;
  onClick?: () => void;
  active?: boolean;
}

export function DockItem({
  children,
  className,
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  mouseX,
  onClick,
  active,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const distanceCalc = useTransform(mouseX ?? useMotionValue(Infinity), (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [40, magnification, 40]
  );

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className={cn(
        "relative flex aspect-square cursor-pointer items-center justify-center rounded-full",
        active && "bg-white/[0.08]",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      {children}
      {active && (
        <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white" />
      )}
    </motion.div>
  );
}

export function DockLabel({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        "absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/[0.08] bg-black/80 px-2 py-0.5 text-xs text-white opacity-0 backdrop-blur-xl transition-opacity group-hover:opacity-100",
        className
      )}
    >
      {children}
    </span>
  );
}

export function DockIcon({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {children}
    </div>
  );
}

export function DockSeparator({ className }: { className?: string }) {
  return (
    <div className={cn("mx-1 h-8 w-px bg-white/[0.1]", className)} />
  );
}
