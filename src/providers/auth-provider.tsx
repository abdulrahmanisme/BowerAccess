import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { identifyPostHogUser, resetPostHogUser } from "@/integrations/posthog";
import { trackEvent } from "@/lib/tracking";
import { AuthContext, type AuthState } from "@/contexts/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAdmin: false,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;

      setState((prev) => ({
        ...prev,
        user,
        session,
        isLoading: false,
        isAdmin: user ? prev.isAdmin : false,
      }));

      if (!user) {
        if (event === "SIGNED_OUT") {
          resetPostHogUser();
        }
        return;
      }

      identifyPostHogUser(user.id, {
        email: user.email || null,
        provider: session?.user?.app_metadata?.provider || "google",
      });

      void (async () => {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setState((prev) => ({
          ...prev,
          isAdmin: !!data,
        }));

        identifyPostHogUser(user.id, {
          is_admin: !!data,
        });
      })();

      if (event === "SIGNED_IN") {
        void supabase.from("visits").insert({
          user_id: user.id,
          referral_source: document.referrer || null,
        });

        void trackEvent({
          userId: user.id,
          eventType: "click_login",
          pagePath: window.location.pathname,
          eventSource: "auth",
          metadata: {
            provider: session?.user?.app_metadata?.provider || "google",
          },
        });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setState({ user: null, session: null, isLoading: false, isAdmin: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await trackEvent({
        userId: data.user.id,
        eventType: "click_logout",
        pagePath: window.location.pathname,
        eventSource: "auth",
      });
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
