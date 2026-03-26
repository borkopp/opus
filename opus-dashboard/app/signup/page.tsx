import { AuthLayout } from "@/components/login";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <AuthLayout>
            <SignUp fallbackRedirectUrl="/onboarding" signInUrl="/login" />
        </AuthLayout>
    );
}
