export default {
  providers: [
    {
      // This tells Convex to trust your specific Clerk project
      domain: "https://trusty-civet-87.clerk.accounts.dev",
      applicationID: "convex",
    },
    {
      domain: "https://clerk.paper.malachyf.com",
      applicationID: "convex",
    },
  ],
};