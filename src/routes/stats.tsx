import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ClickToCopyIcon } from "~components/ClickToCopy";
import { Routes } from "~types/worker/sync";
import { queryClient } from "~utils/data/query";
import { signedFetch, URL_BASE } from "~utils/data/share";

function getUseStatsParams(): UseQueryOptions<
  Routes["/api/meta/stats"]["get"] | null
> {
  return {
    queryKey: ["@referee-fyi/stats"],
    queryFn: async () => {
      const response = await signedFetch(new URL(`/api/meta/stats`, URL_BASE), {
        method: "GET",
      });
      const json = await response.json();
      return json as Routes["/api/meta/stats"]["get"];
    },
  };
}

function useStats() {
  return useQuery(getUseStatsParams());
}

export const StatsPage: React.FC = () => {
  const { data: stats, dataUpdatedAt } = useStats();

  return (
    <main className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 grid-flow-row overflow-y-auto mt-4 gap-4 lg:grid-rows-12">
      <section className="bg-zinc-900 p-4 rounded-md lg:col-span-2 lg:row-span-2">
        <h2 className="font-extrabold text-3xl text-emerald-400 font-mono">
          {stats?.data.users.length ?? "??"}
        </h2>
        <p className="text-zinc-400">Registered Users</p>
      </section>
      <section className="bg-zinc-900 p-4 rounded-md lg:col-span-2 lg:row-span-2"></section>
      <section className="bg-zinc-900 p-4 rounded-md lg:col-span-2 lg:row-span-2">
        <h2 className="font-extrabold text-md text-emerald-400 font-mono">
          {new Date(dataUpdatedAt).toLocaleString()}
        </h2>
        <p className="text-zinc-400">Updated Data</p>
      </section>
      <section className="bg-zinc-900 p-4 rounded-md lg:col-span-3 lg:row-span-10">
        <h2 className="font-bold">Registered Users</h2>
        {stats?.data.users.map((user) => (
          <div key={user.key} className="flex items-center gap-2">
            <ClickToCopyIcon value={user.key} />
            <p>{user.name}</p>
          </div>
        ))}
      </section>
      <section className="bg-zinc-900 p-4 rounded-md lg:col-span-3 lg:row-span-10"></section>
    </main>
  );
};

export const Route = createFileRoute("/stats")({
  component: StatsPage,
  beforeLoad: async () => queryClient.ensureQueryData(getUseStatsParams()),
});
