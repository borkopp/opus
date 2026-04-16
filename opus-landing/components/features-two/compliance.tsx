import React from "react";
import Image from "next/image";

const complianceLogos = [
  {
    name: "GDPR",
    src: "https://assets.aceternity.com/logos/gdpr-logo.webp",
  },
  {
    name: "ISO",
    src: "https://assets.aceternity.com/logos/iso-logo.webp",
  },
  {
    name: "SOC2",
    src: "https://assets.aceternity.com/logos/soc2.webp",
  },
];

export const Compliance = () => {
  return (
    <div className="flex items-center justify-center">
      {complianceLogos.map((logo, index) => (
        <div
          key={logo.name}
          className="relative flex size-20 items-center justify-center overflow-hidden"
        >
          <Image
            src={logo.src}
            alt={logo.name}
            width={100}
            height={100}
            className="object-contain dark:invert dark:filter"
          />
        </div>
      ))}
    </div>
  );
};
