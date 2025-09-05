import { createFileRoute, redirect } from "@tanstack/react-router";
import { getShareProfile, registerUser } from "~utils/data/share";

export const StatsPage: React.FC = () => {
  return (
    <main className="max-w-prose md:max-w-screen-md lg:max-w-screen-lg overflow-y-auto mt-4">
      <p>Hello</p>
    </main>
  );
};

export const Route = createFileRoute("/stats")({
  component: StatsPage,
  beforeLoad: async () => {
    const response = await registerUser(await getShareProfile());
    if (!response.success || !response.data.isSystemKey) {
      return redirect({ to: "/", from: "/stats" });
    }
  },
});
