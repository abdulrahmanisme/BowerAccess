import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, signInWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  if (user && !isLoading) {
    navigate({ to: "/" });
    return null;
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img
            src="/bower-logo.png"
            alt="Bower logo"
            className="mx-auto mb-3 h-12 w-12 rounded-xl object-cover"
            loading="lazy"
          />
          <CardTitle className="font-display text-2xl">Sign in to Bower Access</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in or sign up with your Google account to continue
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={signInWithGoogle} className="w-full" size="lg" disabled={isLoading}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
