"use client";
import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  IconApi,
  IconMenu2,
  IconMessagePlus,
  IconRotate,
  IconX,
} from "@tabler/icons-react";


export interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

import { Logo as OpusLogo } from "@/components/Logo";

export const Logo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 "
    >
      {/* <div className="h-7 w-8 flex-shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" /> */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-black dark:text-white"
      >
        <OpusLogo className="text-3xl " />
      </motion.span>
    </Link>
  );
};
// export const LogoIcon = () => {
//   return (
//     <Link
//       href="#"
//       className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
//     >
//       <div className="h-5 w-6 flex-shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
//     </Link>
//   );
// };

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <motion.div
        className={cn(
          "hidden h-full w-[300px] flex-shrink-0 bg-neutral-100 px-4 py-4 md:flex md:flex-col dark:bg-neutral-800",
          className,
        )}
        animate={{ width: "300px" }}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        className={cn(
          "flex h-10 w-full flex-row items-center justify-between bg-neutral-100 px-4 py-4 md:hidden dark:bg-neutral-800",
        )}
        {...props}
      >
        <div className="z-20 flex w-full justify-end">
          <IconMenu2
            className="text-neutral-800 dark:text-neutral-200"
            onClick={() => {
              setOpen(true);
            }}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn(
                "fixed inset-0 z-[100] flex h-full w-full flex-col justify-between bg-white p-4 sm:p-10 dark:bg-neutral-900",
                className,
              )}
            >
              <div
                className="absolute top-10 right-10 z-50 text-neutral-800 dark:text-neutral-200"
                onClick={() => {
                  setOpen(false);
                }}
              >
                <IconX />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps;
}) => {
  const pathname = usePathname();
  const isActive =
    pathname === link.href ||
    (link.href !== "/" && pathname?.startsWith(link.href));

  return (
    <Link
      href={link.href}
      className={cn(
        "group/sidebar relative px-4 py-2 mx-2 rounded-xl transition-all duration-200",
        isActive
          ? "bg-white shadow-sm border border-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
          : "text-neutral-500 hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-white border border-transparent",
        className,
      )}
      {...props}
    >
      <div className="relative z-20 flex items-center justify-start gap-3">
        <div
          className={cn(
            "transition-colors",
            isActive
              ? "text-primary"
              : "text-neutral-500 group-hover/sidebar:text-neutral-900 dark:text-neutral-400 dark:group-hover/sidebar:text-white",
          )}
        >
          {link.icon}
        </div>

        <motion.span
          animate={{ display: "inline-block", opacity: 1 }}
          className={cn(
            "!m-0 inline-block !p-0 text-sm font-medium whitespace-pre transition duration-150 group-hover/sidebar:translate-x-1",
            isActive
              ? "text-neutral-900 dark:text-white"
              : "text-neutral-600 dark:text-neutral-400",
          )}
        >
          {link.label}
        </motion.span>
      </div>
    </Link>
  );
};
