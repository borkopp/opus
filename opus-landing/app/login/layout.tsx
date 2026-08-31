import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | OPUS",
  description: "Sign in to manage your beauty studio with OPUS.",
  openGraph: {
    title: "Sign in | OPUS",
    description: "Sign in to manage your beauty studio with OPUS.",
    type: "website",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
