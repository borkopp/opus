import { AuthLayout } from "@/components/login";
import { SignIn } from "@clerk/nextjs";

export default function Login() {
    return (
        <AuthLayout>
            <SignIn path="/login" fallbackRedirectUrl="/onboarding" signUpUrl="/signup" />
        </AuthLayout>
    );
}
