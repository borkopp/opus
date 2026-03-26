"use client";

import {
  CogIcon,
  ErrorIcon,
  FileIcon,
  HubspotIcon,
  SalesforceIcon,
  SheetsIcon,
} from "@/icons";
import {
  FifthIcon,
  FirstIcon,
  FourthIcon,
  RecentActivityIcon,
  SecondIcon,
  ThirdIcon,
} from "@/icons/bento-icons";
import { cn } from "@/lib/utils";
import { IconClock } from "@tabler/icons-react";
import { motion } from "motion/react";

export const SkeletonOne = () => {
  const cardItems = [
    {
      icon: <FirstIcon />,
      iconClassName: "bg-blue-500",
      title: "Personalized Email",
      description: "Personalized Email sent to ••••• @gmail.com",
      badge: (
        <div className="flex gap-1 items-center px-1 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-200/10 dark:bg-neutral-200/10">
          <IconClock className="size-3" />
          <p className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
            15s
          </p>
        </div>
      ),
    },
    {
      icon: <SecondIcon />,
      iconClassName: "bg-red-500",
      title: "Peer Review",
      description:
        "Reviewed and approved 2 outputs from Content Drafting Agent",
      badge: (
        <div className="flex gap-1 items-center px-1 py-0.5 rounded-md bg-red-100 border border-red-200 dark:bg-red-100/10 dark:border-red-200/10">
          <p className="text-[10px] font-bold text-red-500">FAILED</p>
        </div>
      ),
    },
    {
      icon: <ThirdIcon />,
      iconClassName: "bg-orange-500",
      title: "Content Drafting",
      description: "Generated draft campaign brief",
      badge: (
        <div className="flex gap-1 items-center px-1 py-0.5 rounded-md bg-orange-100 border border-orange-200 dark:bg-orange-100/10 dark:border-orange-200/10">
          <p className="text-[10px] font-bold text-orange-500">PROCESSING</p>
        </div>
      ),
    },
    {
      icon: <FourthIcon />,
      iconClassName: "bg-black",
      title: "Admin Approval",
      description: "Final approval of marketing copy before publishing",
      badge: (
        <div className="flex gap-1 items-center px-1 py-0.5 rounded-md bg-orange-100 dark:bg-orange-100/10 dark:border-orange-100/10  border border-orange-200">
          <p className="text-[10px] font-bold text-orange-500">PROCESSING</p>
        </div>
      ),
    },
    {
      icon: <FifthIcon />,
      iconClassName: "bg-indigo-500",
      title: "Weekly Campaign Report",
      description: "Generated campaign performance report",
      badge: (
        <div className="flex gap-1 items-center px-1 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-200/10 dark:bg-neutral-200/10">
          <IconClock className="size-3" />
          <p className="text-[10px] font-bold text-neutral-600">2m</p>
        </div>
      ),
    },

    {
      icon: <SecondIcon />,
      iconClassName: "bg-red-500",
      title: "SEO Audit",
      description:
        "Reviewed and approved 2 outputs from Content Drafting Agent",
      badge: (
        <div className="flex gap-1 items-center px-1 py-0.5 rounded-md bg-red-100 border border-red-200 dark:bg-red-100/10 dark:border-red-200/10">
          <p className="text-[10px] font-bold text-red-500">FAILED</p>
        </div>
      ),
    },
    {
      icon: <ThirdIcon />,
      iconClassName: "bg-orange-500",
      title: "Price Monitoring Agent",
      description: "Generated draft campaign brief",
      badge: (
        <div className="flex gap-1 items-center px-1 py-0.5 rounded-md bg-orange-100 border border-orange-200 dark:bg-orange-100/10 dark:border-orange-200/10">
          <p className="text-[10px] font-bold text-orange-500">PROCESSING</p>
        </div>
      ),
    },
  ];
  return (
    <div className="flex-1 rounded-t-3xl gap-2 flex flex-col bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 mx-auto w-full h-full absolute inset-x-10 inset-y-2 pt-2 px-2">
      <Card>
        {cardItems.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="w-full"
          >
            <CardItem
              index={idx}
              key={item.title}
              icon={item.icon}
              iconClassName={item.iconClassName}
              title={item.title}
              description={item.description}
              badge={item.badge}
            />
          </motion.div>
        ))}
      </Card>
    </div>
  );
};

const Card = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="shadow-black/10 gap-4 border bg-white dark:bg-neutral-900 border-transparent ring-1 rounded-tl-[16px] ring-black/10 flex flex-col items-start flex-1">
      <div className="flex items-center gap-2 border-b w-full py-2 px-4">
        <RecentActivityIcon />
        <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
          Recent Activity
        </p>
      </div>

      {children}
    </div>
  );
};

const CardItem = ({
  icon,
  iconClassName,
  title,
  description,
  badge,
  index,
}: {
  icon: React.ReactNode;
  iconClassName?: string;
  title: string;
  description: string;
  badge: React.ReactNode;
  index: number;
}) => {
  return (
    <div className="flex justify-between items-center  w-full pl-4 relative overflow-hidden">
      <div className=" items-center gap-2 flex">
        <div
          className={cn(
            "size-5 rounded-sm bg-blue-500 text-white flex items-center justify-center",
            iconClassName
          )}
        >
          {icon}
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {title}
        </p>
        {badge}
      </div>
      <motion.p className="text-sm text-neutral-500 dark:text-neutral-400 flex-nowrap max-w-[16rem] w-full text-left whitespace-nowrap">
        {description.split("").map((item, idx) => (
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: idx * 0.01 + index * 0.1 }}
            key={idx}
          >
            {item}
          </motion.span>
        ))}
      </motion.p>
    </div>
  );
};

const Tag = ({ text, icon }: { text: string; icon: React.ReactNode }) => {
  return (
    <div className="flex items-center gap-1 w-fit rounded-sm px-1 py-0.5 border border-neutral-200 text-sm">
      {icon}
      <p className="text-xs text-neutral-500">{text}</p>
    </div>
  );
};
