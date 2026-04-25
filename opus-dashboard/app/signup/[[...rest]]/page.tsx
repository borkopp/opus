import { AuthLayout } from "@/components/login";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <AuthLayout>
            <SignUp path="/signup" fallbackRedirectUrl="/onboarding" signInUrl="/login" />
        </AuthLayout>
    );
}
