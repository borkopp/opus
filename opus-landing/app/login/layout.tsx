import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Simplistic",
  description:
    "Sign in to your Simplistic account. Access your dashboard, manage your projects, and stay productive.",
  openGraph: {
    title: "Login | Simplistic",
    description:
      "Sign in to your Simplistic account. Access your dashboard, manage your projects, and stay productive.",
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
