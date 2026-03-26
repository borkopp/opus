"use client";

import {
  CogIcon,
  ErrorIcon,
  FileIcon,
  HubspotIcon,
  SalesforceIcon,
  SheetsIcon,
} from "@/icons";
import { cn } from "@/lib/utils";
import {
  IconClipboardData,
  IconFeatherFilled,
  IconFileDotsFilled,
  IconFilter2Search,
  IconPointerUp,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export const SkeletonFour = () => {
  const items = [
    {
      title: "Brand & Style",
      icon: <IconClipboardData className="size-4 text-blue-500" />,
      className:
        "bg-blue-100 border border-blue-200 dark:bg-blue-100/10 dark:border-blue-200/10",
      description:
        "Link CRMs, helpdesks, and APIs to give agents secure, role-based access.",
      tags: [
        { text: "Salesforce", icon: <SalesforceIcon className="size-3" /> },
        { text: "Hubspot", icon: <HubspotIcon className="size-3" /> },
        { text: "Sheets", icon: <SheetsIcon className="size-3" /> },
      ],
    },
    {
      title: "Compliance & Policy",
      icon: <IconFileDotsFilled className="size-4 text-green-500" />,
      className:
        "bg-green-100 border border-green-200 dark:bg-green-100/10 dark:border-green-200/10",
      description:
        "Ensure your AI agents follow company policies and regulatory requirements with built-in compliance controls.",
      tags: [
        { text: "Salesforce", icon: <SalesforceIcon className="size-3" /> },
        { text: "Hubspot", icon: <HubspotIcon className="size-3" /> },
        { text: "Sheets", icon: <SheetsIcon className="size-3" /> },
      ],
    },
    {
      title: "Content Safety Filters",
      icon: <IconFeatherFilled className="size-4 text-indigo-500" />,
      className:
        "bg-indigo-100 border border-indigo-200 dark:bg-indigo-100/10 dark:border-indigo-200/10",
      description:
        "Protect your brand from harmful content with built-in safety filters that block sensitive or inappropriate material.",
      tags: [
        { text: "Salesforce", icon: <SalesforceIcon className="size-3" /> },
        { text: "Hubspot", icon: <HubspotIcon className="size-3" /> },
        { text: "Sheets", icon: <SheetsIcon className="size-3" /> },
      ],
    },
    {
      title: "Approval Triggers",
      icon: <IconPointerUp className="size-4 text-neutral-500" />,
      className:
        "bg-neutral-100 border border-neutral-200 dark:bg-neutral-100/10 dark:border-neutral-200/10",
      description:
        "Automatically trigger approvals based on predefined criteria, ensuring timely review and compliance.",
      tags: [
        { text: "Salesforce", icon: <SalesforceIcon className="size-3" /> },
        { text: "Hubspot", icon: <HubspotIcon className="size-3" /> },
        { text: "Sheets", icon: <SheetsIcon className="size-3" /> },
      ],
    },
    {
      title: "Output Quality Checks",
      icon: <IconFilter2Search className="size-4 text-purple-500" />,
      className:
        "bg-purple-100 border border-purple-200 dark:bg-purple-100/10 dark:border-purple-200/10",
      description:
        "Automatically trigger approvals based on predefined criteria, ensuring timely review and compliance.",
      tags: [
        { text: "Salesforce", icon: <SalesforceIcon className="size-3" /> },
        { text: "Hubspot", icon: <HubspotIcon className="size-3" /> },
        { text: "Sheets", icon: <SheetsIcon className="size-3" /> },
      ],
    },
  ];

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);

  const [selected, setSelected] = useState(items[0]);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, []);

  const startAutoplay = () => {
    stopAutoplay();

    intervalRef.current = setInterval(() => {
      currentIndexRef.current = (currentIndexRef.current + 1) % items.length;
      setSelected(items[currentIndexRef.current]);
    }, 2000);
  };

  const stopAutoplay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  return (
    <div>
      <div className="flex gap-4 items-center justify-center max-w-lg mx-auto flex-wrap mb-4">
        {items.map((item, idx) => (
          <button
            key={item.title}
            onClick={() => setSelected(item)}
            className={cn(
              "px-2 py-1 rounded-sm relative text-xs gap-1 cursor-pointer active:scale-98 transition duration-200 flex items-center justify-center opacity-50",
              selected.title === item.title && "opacity-100",
              item.className
            )}
          >
            {selected.title === item.title && (
              <motion.div
                layoutId="selected-item"
                className="absolute inset-0 rounded-[5px] shadow-inner"
              ></motion.div>
            )}
            {item.icon}
            {item.title}
          </button>
        ))}
      </div>
      <div className="flex-1 rounded-t-3xl gap-2 flex flex-col bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 border border-neutral-200 max-w-[20rem] lg:max-w-sm mx-auto w-full h-full absolute inset-x-0 p-2">
        <Card
          topIcon={selected.icon}
          title={selected.title}
          description={selected.description}
          tags={selected.tags}
          className={selected.className}
        />
      </div>
    </div>
  );
};

const Card = ({
  topIcon,
  title,
  description,
  tags,
  className,
}: {
  topIcon: React.ReactNode;
  title: string;
  description: string;
  tags: { text: string; icon: React.ReactNode }[];
  className?: string;
}) => {
  return (
    <motion.div
      key={title}
      className="p-4 shadow-black/10 gap-4 border bg-white dark:bg-neutral-900 border-transparent ring-1 rounded-[16px] ring-black/10 flex items-start flex-col"
    >
      <div className="flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "size-6 shrink-0 rounded-full flex mt-1 items-center justify-center",
            className
          )}
        >
          {topIcon}
        </motion.div>
        <motion.p
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
          }}
          transition={{
            delay: 0.1,
          }}
          className="text-lg font-bold text-neutral-800 dark:text-neutral-200"
        >
          {title}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-base text-neutral-600">Tone Guidelines</p>
        <p className="text-sm mt-2 mb-4 text-neutral-600 dark:text-neutral-400 rounded-sm border border-neutral-200 dark:border-neutral-200/10 px-2 border-dashed py-1">
          {description}
        </p>
        <div className="mt-2 flex flex-row flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <motion.div
              key={tag.text + idx}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <Tag key={tag.text + idx} text={tag.text} icon={tag.icon} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const Tag = ({ text, icon }: { text: string; icon: React.ReactNode }) => {
  return (
    <div className="flex items-center gap-1 w-fit rounded-sm px-1 py-0.5 border border-neutral-200 dark:border-neutral-200/10 text-sm">
      {icon}
      <p className="text-xs text-neutral-500">{text}</p>
    </div>
  );
};
