"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BadgeItem {
  label: string;
  color: string;
}

interface DatabaseWithRestApiProps {
  className?: string;
  badges?: BadgeItem[];
  title?: string;
  description?: string;
}

const defaultBadges: BadgeItem[] = [
  { label: "Create", color: "#8b5cf6" },
  { label: "Commit", color: "#6366f1" },
  { label: "Reveal", color: "#3b82f6" },
  { label: "Resolve", color: "#14b8a6" },
  { label: "Claim", color: "#10b981" },
];

export function DatabaseWithRestApi({
  className,
  badges = defaultBadges,
  title = "On-Chain Operations",
  description = "Zero-knowledge proof verification and settlement",
}: DatabaseWithRestApiProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex flex-col items-center">
        {/* Title */}
        <div className="mb-8 text-center">
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>

        {/* Main visualization */}
        <div className="relative flex w-full max-w-2xl items-center justify-center gap-8">
          {/* Left: API Badges */}
          <div className="flex flex-col gap-2">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: badge.color }}
                />
                <span className="text-zinc-300">{badge.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Center: Animated paths */}
          <div className="relative flex-1 min-w-[120px]">
            <svg
              viewBox="0 0 200 160"
              className="h-40 w-full"
              fill="none"
            >
              {/* Connection paths */}
              {badges.map((badge, i) => {
                const y = 16 + i * 32;
                return (
                  <g key={badge.label}>
                    <motion.path
                      d={`M 0 ${y} C 60 ${y}, 140 80, 200 80`}
                      stroke={badge.color}
                      strokeWidth="1"
                      strokeOpacity="0.3"
                      fill="none"
                    />
                    <motion.circle
                      r="3"
                      fill={badge.color}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 1, 0] }}
                      transition={{
                        duration: 2.5,
                        delay: i * 0.4,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    >
                      <animateMotion
                        dur={`${2.5}s`}
                        repeatCount="indefinite"
                        begin={`${i * 0.4}s`}
                        path={`M 0 ${y} C 60 ${y}, 140 80, 200 80`}
                      />
                    </motion.circle>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right: Database icon */}
          <div className="database relative flex-shrink-0">
            <div className="relative flex h-20 w-20 items-center justify-center">
              {/* Database cylinder SVG */}
              <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
                <ellipse
                  cx="32"
                  cy="16"
                  rx="20"
                  ry="8"
                  className="fill-violet-500/10 stroke-violet-500/40"
                  strokeWidth="1"
                />
                <path
                  d="M12 16v32c0 4.418 8.954 8 20 8s20-3.582 20-8V16"
                  className="stroke-violet-500/40"
                  strokeWidth="1"
                  fill="none"
                />
                <ellipse
                  cx="32"
                  cy="48"
                  rx="20"
                  ry="8"
                  className="fill-violet-500/5 stroke-violet-500/20"
                  strokeWidth="1"
                />
                <ellipse
                  cx="32"
                  cy="32"
                  rx="20"
                  ry="8"
                  className="fill-transparent stroke-violet-500/15"
                  strokeWidth="0.5"
                />
              </svg>

              {/* Animated glow lights */}
              <div className="db-light-1 absolute top-1 right-1 h-2 w-2 rounded-full bg-violet-500/60 blur-sm" />
              <div className="db-light-2 absolute bottom-2 left-1 h-1.5 w-1.5 rounded-full bg-indigo-500/50 blur-sm" />
              <div className="db-light-3 absolute top-1/2 right-0 h-1.5 w-1.5 rounded-full bg-blue-500/40 blur-sm" />
              <div className="db-light-4 absolute bottom-3 right-2 h-1 w-1 rounded-full bg-emerald-500/50 blur-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
