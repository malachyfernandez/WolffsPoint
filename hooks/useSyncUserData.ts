import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth } from "convex/react";

export const useSyncUserData = (userData: any, setUserData: any) => {
    const { user, isLoaded: isClerkLoaded } = useUser();
    const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();

    useEffect(() => {
        if (!isClerkLoaded || isConvexAuthLoading || !isConvexAuthenticated) return;
        
        const isLoggedIn = !!user;
        const isLoaded = userData !== undefined;
        
        if (!isLoggedIn && isLoaded) {
            setUserData({ name: "", email: "", userId: "" });
            console.log("↻ Cleared userData on logout");
            return;
        }
        
        if (isLoggedIn && isLoaded) {
            const clerkEmail = user.primaryEmailAddress?.emailAddress ?? "";
            const clerkName = user.fullName ?? "";
            const clerkUserId = user.id ?? "";
            
            if (userData.email !== clerkEmail || userData.name !== clerkName || userData.userId !== clerkUserId) {
                setUserData({ ...userData, name: clerkName ?? "", email: clerkEmail ?? "", userId: clerkUserId ?? "" });
                console.log("↻ Syncing userData with Clerk");
            }
        }
    }, [user, userData, isClerkLoaded, isConvexAuthLoading, isConvexAuthenticated]);
};