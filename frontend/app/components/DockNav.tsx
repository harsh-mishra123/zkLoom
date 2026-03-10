'use client';

import Link from 'next/link';
import { Wallet, type LucideIcon } from 'lucide-react';
import { Dock, DockItem, DockIcon, DockSeparator } from './ui/dock';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface DockNavProps {
  pathname: string;
  navLinks: NavLink[];
}

export default function DockNav({ pathname, navLinks }: DockNavProps) {
  return (
    <Dock direction="middle">
      {navLinks.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        return (
          <Link key={href} href={href} title={label}>
            <DockItem active={active}>
              <DockIcon>
                <Icon className="h-5 w-5 text-zinc-300" />
              </DockIcon>
            </DockItem>
          </Link>
        );
      })}

      <DockSeparator />

      <DockItem>
        <DockIcon>
          <Wallet className="h-5 w-5 text-zinc-300" />
        </DockIcon>
      </DockItem>
    </Dock>
  );
}
