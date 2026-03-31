import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth } from "convex/react";

export const useSyncUserData = (userData: any, setUserData: any) => {
    const { user, isLoaded: isClerkLoaded } = useUser();
    const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();

    useEffect(() => {
        // Don't proceed if Clerk hasn't loaded yet
        if (!isClerkLoaded) {
            console.log("⏳ Clerk still loading, skipping sync");
            return;
        }

        if (isConvexAuthLoading) {
            console.log("⏳ Convex auth still loading, skipping sync");
            return;
        }

        const isLoggedIn = !!user;
        const isLoaded = userData !== undefined;

        // Only proceed if user is fully loaded and authenticated
        if (!isLoggedIn) {
            console.log("🔒 User not authenticated, skipping sync");
            return;
        }

        if (!isConvexAuthenticated) {
            console.log("🔒 Convex not authenticated, skipping sync");
            return;
        }

        if (isLoaded) {
            const clerkEmail = user.primaryEmailAddress?.emailAddress ?? "";
            const clerkName = user.fullName ?? "";
            const clerkUserId = user.id ?? "";

            // Check if data actually needs updating to avoid infinite loops
            const needsUpdate =
                !userData.email ||
                userData.email !== clerkEmail ||
                userData.name !== clerkName ||
                userData.userId !== clerkUserId;

            if (needsUpdate) {
                setUserData({
                    ...userData,
                    name: clerkName,
                    email: clerkEmail,
                    userId: clerkUserId,
                });
                console.log("↻ Syncing userData with Clerk");
            }
        }
    }, [user, userData, isClerkLoaded, isConvexAuthLoading, isConvexAuthenticated]);
};