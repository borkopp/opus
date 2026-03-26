import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 md:p-6">
        <Logo />
      </header>
      <div className="flex-1 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
