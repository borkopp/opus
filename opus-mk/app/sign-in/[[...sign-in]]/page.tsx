import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SignIn
        fallbackRedirectUrl="/"
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none border border-border/40 rounded-2xl bg-card",
            headerTitle: "font-display text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "rounded-xl border-border/40 hover:bg-secondary/50 transition-colors",
            formFieldInput:
              "rounded-xl border-border/40 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
            formButtonPrimary:
              "bg-cta text-cta-foreground hover:bg-cta/90 rounded-xl font-semibold",
            footerActionLink: "text-primary hover:text-primary/80",
          },
        }}
      />
    </div>
  );
}
