import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useEnsureProfile } from "@/hooks/useEnsureProfile";
import { useUserFleets } from "@/hooks/useUserFleets";
import ProfileHeader from "@/components/profile/ProfileHeader";
import UserFleetsCard from "@/components/profile/UserFleetsCard";
import MembershipsTable from "@/components/profile/MembershipsTable";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import { PageLoader } from "@/components/dashboard/PageLoader";

const Profile = () => {
  const {
    user,
    role,
    memberships,
    isLoading: authLoading,
    refreshMemberships,
    refreshUser,
  } = useAuth();
  const { fleets, fleetById, isLoading: isLoadingFleets, error: fleetsError, refresh: refreshFleets } = useUserFleets(memberships);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEnsureProfile(user);

  // Rafraîchir les adhésions au montage pour avoir les dernières données (ex. après acceptation d'invitation).
  useEffect(() => {
    if (!authLoading && user) {
      refreshMemberships();
    }
  }, [authLoading, user, refreshMemberships]);

  const handleProfileUpdate = useCallback(() => {
    refreshUser();
  }, [refreshUser]);

  const handleRefreshFleets = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshMemberships();
      await refreshFleets();
    } catch (e) {
      console.error("Erreur lors du rafraîchissement:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshMemberships, refreshFleets]);

  const fullName = useMemo(() => {
    if (!user) return "";
    const meta = user.user_metadata || {};
    return meta.full_name || user.email?.split("@")[0] || "Utilisateur";
  }, [user]);

  const initials = useMemo(() => {
    return fullName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [fullName]);

  const createdAt = useMemo(() => {
    if (!user?.created_at) return "N/A";
    return new Date(user.created_at).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [user]);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 sm:space-y-6">
              <ProfileHeader
                user={user}
                role={role}
                fullName={fullName}
                initials={initials}
                createdAt={createdAt}
              />

              <ProfileEditForm user={user} onUpdate={handleProfileUpdate} />

              <UserFleetsCard
                fleets={fleets}
                memberships={memberships}
                isLoading={isLoadingFleets}
                error={fleetsError}
                isRefreshing={isRefreshing}
                onRefresh={handleRefreshFleets}
              />

              {memberships.length > 0 && (
                <MembershipsTable memberships={memberships} fleetById={fleetById} />
              )}
    </div>
  );
};

export default Profile;
