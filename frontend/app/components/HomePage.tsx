'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Zap, ArrowRight, ChevronRight, BarChart3, Users, TrendingUp, Calendar, Code, FileText, Clock, CheckCircle, Globe } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import type { BentoItem } from '@/app/components/ui/bento-grid';

const InfiniteSlider = dynamic(() => import('@/app/components/ui/infinite-slider').then(m => ({ default: m.InfiniteSlider })), { ssr: false });
const ProgressiveBlur = dynamic(() => import('@/app/components/ui/progressive-blur').then(m => ({ default: m.ProgressiveBlur })), { ssr: false });
const RadialOrbitalTimeline = dynamic(() => import('@/app/components/ui/radial-orbital-timeline'), { ssr: false, loading: () => <div className="w-full h-screen flex items-center justify-center bg-black"><div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-teal-500 animate-pulse" /></div> });
const BentoGrid = dynamic(() => import('@/app/components/ui/bento-grid').then(m => ({ default: m.BentoGrid })), { ssr: false });

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const features = [
  {
    icon: Lock,
    title: 'Private Predictions',
    desc: 'Your predictions are hidden using Poseidon hashes — nobody sees your choice until you reveal it.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: Shield,
    title: 'ZK Proof Verified',
    desc: 'Circom circuits generate zero-knowledge proofs that validate your prediction without exposing it.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Eye,
    title: 'Commit-Reveal Scheme',
    desc: 'First commit a hash of your prediction, then reveal after resolution. No front-running, no manipulation.',
    gradient: 'from-emerald-500 to-green-500',
  },
  {
    icon: Zap,
    title: 'On-Chain Settlement',
    desc: 'Smart contracts on Ethereum Sepolia handle all market logic — creation, betting, resolution, and payouts.',
    gradient: 'from-amber-500 to-orange-500',
  },
];

const stats = [
  { label: 'Privacy Protocol', value: 'Poseidon Hash', icon: Lock },
  { label: 'Proof System', value: 'Groth16 / Circom', icon: Shield },
  { label: 'Network', value: 'Ethereum Sepolia', icon: TrendingUp },
];

const timelineData = [
  {
    id: 1,
    title: 'Create Market',
    date: 'Step 1',
    content: 'Anyone can create a prediction market with a question and a resolution date.',
    category: 'Setup',
    icon: Calendar,
    relatedIds: [2],
    status: 'completed' as const,
    energy: 100,
  },
  {
    id: 2,
    title: 'Commit Prediction',
    date: 'Step 2',
    content: 'Choose YES or NO, stake ETH. Your prediction is hashed with Poseidon — nobody sees your choice.',
    category: 'Privacy',
    icon: Lock,
    relatedIds: [1, 3],
    status: 'completed' as const,
    energy: 90,
  },
  {
    id: 3,
    title: 'ZK Proof Generation',
    date: 'Step 3',
    content: 'Circom circuits generate a Groth16 zero-knowledge proof validating your commitment.',
    category: 'Cryptography',
    icon: Code,
    relatedIds: [2, 4],
    status: 'in-progress' as const,
    energy: 70,
  },
  {
    id: 4,
    title: 'Market Resolution',
    date: 'Step 4',
    content: 'The market resolves after the deadline. The outcome is determined on-chain.',
    category: 'Settlement',
    icon: FileText,
    relatedIds: [3, 5],
    status: 'pending' as const,
    energy: 40,
  },
  {
    id: 5,
    title: 'Reveal & Claim',
    date: 'Step 5',
    content: 'Reveal your prediction with a ZK proof. If correct, claim your share of the losing pool.',
    category: 'Payout',
    icon: Clock,
    relatedIds: [4],
    status: 'pending' as const,
    energy: 20,
  },
];

const marketBentoItems: BentoItem[] = [
  {
    title: 'Private Predictions',
    meta: 'Poseidon Hash',
    description: 'Your predictions are cryptographically hidden until market resolution — zero exposure, full privacy.',
    icon: <Lock className="w-4 h-4 text-violet-500" />,
    status: 'Live',
    tags: ['ZK', 'Privacy', 'Commit'],
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    title: 'Groth16 Proofs',
    meta: 'Circom 2.0',
    description: 'Zero-knowledge proofs validate your prediction without revealing it to anyone.',
    icon: <Shield className="w-4 h-4 text-blue-500" />,
    status: 'Active',
    tags: ['Cryptography', 'Verification'],
  },
  {
    title: 'On-Chain Markets',
    meta: 'Sepolia',
    description: 'Smart contracts handle creation, betting, resolution and automated payouts.',
    icon: <Globe className="w-4 h-4 text-emerald-500" />,
    tags: ['Ethereum', 'Solidity'],
    colSpan: 2,
  },
  {
    title: 'Fair Settlement',
    meta: 'Commit-Reveal',
    description: 'No front-running or manipulation — reveal only after market resolves.',
    icon: <CheckCircle className="w-4 h-4 text-amber-500" />,
    status: 'Secured',
    tags: ['Fairness', 'Trust'],
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <main className="overflow-x-hidden">
        <section>
          <div className="pb-24 pt-12 md:pb-32 lg:pb-56 lg:pt-44">
            <div className="relative mx-auto flex max-w-6xl flex-col px-6 lg:block">
              <div className="mx-auto max-w-lg text-center lg:ml-0 lg:w-1/2 lg:text-left">
                <h1 className="mt-8 max-w-2xl text-balance text-5xl font-medium md:text-6xl lg:mt-16 xl:text-7xl">
                  Prediction Markets{' '}
                  <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                    Powered by ZK
                  </span>
                </h1>
                <p className="mt-8 max-w-2xl text-pretty text-lg text-zinc-400">
                  Place private predictions on real-world events. Your choice stays hidden behind a
                  cryptographic commitment until the market resolves — no front-running, no bias,
                  just pure provable truth.
                </p>

                <div className="mt-12 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start">
                  <Button asChild size="lg" className="px-5 text-base">
                    <Link href="/markets">
                      <span className="text-nowrap">Explore Markets</span>
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost" className="px-5 text-base">
                    <Link href="#how-it-works">
                      <span className="text-nowrap">How It Works</span>
                    </Link>
                  </Button>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="pointer-events-none order-first ml-auto h-56 w-full object-cover invert sm:h-96 lg:absolute lg:inset-0 lg:-right-20 lg:-top-96 lg:order-last lg:h-max lg:w-2/3 lg:object-contain dark:mix-blend-lighten dark:invert-0"
                src="https://ik.imagekit.io/lrigu76hy/tailark/abstract-bg.jpg?updatedAt=1745733473768"
                alt="Abstract Background"
                height={4000}
                width={3000}
              />
            </div>
          </div>
        </section>

        {/* Protocol Partners Slider */}
        <section className="bg-background pb-16 md:pb-32">
          <div className="group relative m-auto max-w-6xl px-6">
            <div className="flex flex-col items-center md:flex-row">
              <div className="md:max-w-44 md:border-r md:pr-6">
                <p className="text-end text-sm">Powered by leading protocols</p>
              </div>
              <div className="relative py-6 md:w-[calc(100%-11rem)]">
                <InfiniteSlider durationOnHover={20} duration={40} gap={112}>
                  <div className="flex">
                    <img className="mx-auto h-5 w-fit dark:invert" src="https://html.tailus.io/blocks/customers/nvidia.svg" alt="Nvidia Logo" height={20} width={120} />
                  </div>
                  <div className="flex">
                    <img className="mx-auto h-4 w-fit dark:invert" src="https://html.tailus.io/blocks/customers/column.svg" alt="Column Logo" height={16} width={120} />
                  </div>
                  <div className="flex">
                    <img className="mx-auto h-4 w-fit dark:invert" src="https://html.tailus.io/blocks/customers/github.svg" alt="GitHub Logo" height={16} width={120} />
                  </div>
                  <div className="flex">
                    <img className="mx-auto h-5 w-fit dark:invert" src="https://html.tailus.io/blocks/customers/nike.svg" alt="Nike Logo" height={20} width={120} />
                  </div>
                  <div className="flex">
                    <img className="mx-auto h-5 w-fit dark:invert" src="https://html.tailus.io/blocks/customers/lemonsqueezy.svg" alt="Lemon Squeezy Logo" height={20} width={120} />
                  </div>
                  <div className="flex">
                    <img className="mx-auto h-4 w-fit dark:invert" src="https://html.tailus.io/blocks/customers/laravel.svg" alt="Laravel Logo" height={16} width={120} />
                  </div>
                  <div className="flex">
                    <img className="mx-auto h-7 w-fit dark:invert" src="https://html.tailus.io/blocks/customers/lilly.svg" alt="Lilly Logo" height={28} width={120} />
                  </div>
                  <div className="flex">
                    <img className="mx-auto h-6 w-fit dark:invert" src="https://html.tailus.io/blocks/customers/openai.svg" alt="OpenAI Logo" height={24} width={120} />
                  </div>
                </InfiniteSlider>

                <div className="bg-linear-to-r from-background absolute inset-y-0 left-0 w-20"></div>
                <div className="bg-linear-to-l from-background absolute inset-y-0 right-0 w-20"></div>
                <ProgressiveBlur
                  className="pointer-events-none absolute left-0 top-0 h-full w-20"
                  direction="left"
                  blurIntensity={1}
                />
                <ProgressiveBlur
                  className="pointer-events-none absolute right-0 top-0 h-full w-20"
                  direction="right"
                  blurIntensity={1}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bento Grid — Market Features */}
      <section className="py-24 sm:py-32 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-12"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-violet-400 tracking-wide uppercase">
              Platform Overview
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl sm:text-4xl font-bold text-white">
              Built for Privacy & Trust
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Every prediction is cryptographically secured from commitment to claim.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <BentoGrid items={marketBentoItems} />
          </motion.div>
        </div>
      </section>

      {/* How It Works — Radial Orbital Timeline */}
      <section id="how-it-works" className="border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-4"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-violet-400 tracking-wide uppercase">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl sm:text-4xl font-bold text-white">
              The zkPredict Flow
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Click on each node to explore how your prediction travels from commitment to claim.
            </motion.p>
          </motion.div>
        </div>
        <RadialOrbitalTimeline timelineData={timelineData} />
      </section>

      {/* Features Detail */}
      <section className="py-24 sm:py-32 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-violet-400 tracking-wide uppercase">
              Core Features
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl sm:text-4xl font-bold text-white">
              Zero Knowledge, Full Confidence
            </motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 lg:gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} shadow-lg mb-5`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-24 sm:py-32 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-violet-400 tracking-wide uppercase">
              Architecture
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl sm:text-4xl font-bold text-white">
              The Stack Behind zkPredict
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {[
              { label: 'Frontend', items: ['Next.js 16', 'wagmi v2', 'RainbowKit'], icon: BarChart3 },
              { label: 'Circuits', items: ['Circom 2.0', 'Poseidon Hash', 'Groth16 Proofs'], icon: Shield },
              { label: 'Contracts', items: ['Solidity', 'Commit-Reveal', 'Verifier On-Chain'], icon: Lock },
              { label: 'Network', items: ['Ethereum Sepolia', 'Decentralized', 'Immutable'], icon: Users },
            ].map((stack, i) => (
              <motion.div
                key={stack.label}
                custom={i}
                variants={fadeUp}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <stack.icon className="h-5 w-5 text-violet-400 mb-3" />
                <h4 className="text-sm font-semibold text-white mb-3">{stack.label}</h4>
                <ul className="space-y-1.5">
                  {stack.items.map((item) => (
                    <li key={item} className="text-xs text-zinc-500 flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-violet-500/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-violet-500/[0.08] via-indigo-500/[0.05] to-transparent p-12 sm:p-16 text-center"
          >
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-violet-500/[0.06] rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-indigo-500/[0.04] rounded-full blur-3xl" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to Predict the Future?
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto mb-8">
              Connect your wallet, pick a market, and place a private prediction backed by
              zero-knowledge cryptography. It&apos;s that simple.
            </p>
            <Link
              href="/markets"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600">
              <Shield className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm text-zinc-500">
              zk<span className="text-zinc-400">Predict</span> — Built with Circom, Solidity & Next.js
            </span>
          </div>
          <p className="text-xs text-zinc-600">Sepolia testnet only. Not financial advice.</p>
        </div>
      </footer>
    </div>
  );
}
