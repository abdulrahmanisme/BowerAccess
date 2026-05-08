import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

interface UserAccess {
  isPremium: boolean;
  isLoading: boolean;
  user: ReturnType<typeof useAuth>["user"];
}

export function useUserAccess(): UserAccess {
  const { user, isLoading: authLoading } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsPremium(false);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProfile = async () => {
      setProfileLoading(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn("useUserAccess: could not fetch profile", error);
          setIsPremium(false);
        } else {
          setIsPremium(data?.is_premium ?? false);
        }
      } catch {
        if (!cancelled) {
          setIsPremium(false);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return {
    isPremium,
    isLoading: authLoading || profileLoading,
    user,
  };
}
