import { m, AnimatePresence } from "motion/react";
import { createFileRoute } from "@tanstack/react-router";
import { CameraIcon } from "@heroicons/react/24/solid";
import { getAllIncidents, Incident } from "~utils/data/incident";
import { getShareProfile } from "~utils/data/share";
import { getLocalAsset, LocalAsset } from "~utils/data/assets";
import { WrappedNav } from "../-components";
import { LocalAssetPreview, PhotoFallback } from "~components/Assets";
import { useEvent } from "~utils/hooks/robotevents";

type EventAssetStats = {
  sku: string;
  assetCount: number;
};

type LoadedAsset = {
  id: string;
  localAsset: LocalAsset | null;
};

function computeAssetStats(incidents: Incident[]): {
  totalAssets: number;
  incidentsWithAssets: number;
  eventStats: EventAssetStats[];
  allAssetIds: { id: string; incident: Incident }[];
} {
  const eventAssetCounts: Record<string, number> = {};
  let totalAssets = 0;
  let incidentsWithAssets = 0;
  const allAssetIds: { id: string; incident: Incident }[] = [];

  for (const incident of incidents) {
    const assetCount = incident.assets?.length ?? 0;
    if (assetCount > 0) {
      incidentsWithAssets++;
      totalAssets += assetCount;
      eventAssetCounts[incident.event] =
        (eventAssetCounts[incident.event] ?? 0) + assetCount;

      for (const assetId of incident.assets) {
        allAssetIds.push({ id: assetId, incident });
      }
    }
  }

  const eventStats = Object.entries(eventAssetCounts)
    .map(([event, assetCount]) => ({ sku: event, assetCount }))
    .sort((a, b) => b.assetCount - a.assetCount);

  return { totalAssets, incidentsWithAssets, eventStats, allAssetIds };
}

// Pick random items from array
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const AssetCard: React.FC<{
  asset: LoadedAsset;
  index: number;
}> = ({ asset, index }) => {
  return (
    <m.div
      className="relative rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.8 + index * 0.15, duration: 0.5 }}
    >
      {asset.localAsset ? (
        <LocalAssetPreview asset={asset.localAsset} />
      ) : (
        <PhotoFallback />
      )}
    </m.div>
  );
};

export const Three: React.FC = () => {
  const { totalAssets, incidentsWithAssets, topEvent, randomAssets } =
    Route.useLoaderData();
  const { data: topEventData } = useEvent(topEvent?.sku || "");

  const hasAssets = totalAssets > 0;

  return (
    <AnimatePresence>
      <div className="relative z-10 flex flex-col gap-6 px-6 pt-16 pb-8 w-full">
        <WrappedNav
          backTo="/wrapped/2025-2026/2"
          nextTo="/wrapped/2025-2026/4"
          current={3}
          total={4}
        />
        {hasAssets ? (
          <>
            <m.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <m.h1
                className="text-4xl md:text-5xl font-bold text-white mb-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <CameraIcon className="w-10 h-10 inline-block mr-2 text-emerald-400" />
                <span className="text-emerald-400">{totalAssets}</span> Photos
              </m.h1>
              <m.p
                className="text-zinc-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Captured across {incidentsWithAssets} incidents
              </m.p>
            </m.div>
            {topEvent && (
              <m.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <m.h2
                  className="text-lg font-semibold text-zinc-300 mb-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55, duration: 0.4 }}
                >
                  Most Documented Event
                </m.h2>
                <m.div
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <p className="text-lg">{topEventData?.name}</p>
                  <code className="mono text-sm text-emerald-400">
                    {topEventData?.sku}
                  </code>
                  <p className="text-zinc-400 text-sm mt-1">
                    {topEvent.assetCount} photos captured
                  </p>
                </m.div>
              </m.section>
            )}

            {randomAssets.length > 0 && (
              <m.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <m.h2
                  className="text-lg font-semibold text-zinc-300 mb-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75, duration: 0.4 }}
                >
                  Images
                </m.h2>
                <div className="grid grid-cols-2 gap-3">
                  {randomAssets.map((asset, index) => (
                    <AssetCard key={asset.id} asset={asset} index={index} />
                  ))}
                </div>
              </m.section>
            )}
          </>
        ) : (
          <m.div
            className="text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <CameraIcon className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">No photos captured this season</p>
            <p className="text-zinc-500 text-sm mt-2">
              Try attaching images to your incidents next time!
            </p>
          </m.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export const Route = createFileRoute("/wrapped/2025-2026/3")({
  component: Three,
  loader: async () => {
    const profile = await getShareProfile();
    const incidents = await getAllIncidents();

    const authored = incidents.filter(
      (i) => i.consistency.outcome.peer == profile.key
    );

    const seasonStartDate = new Date("2025-05-15T00:00:00.000Z");

    const authoredThisSeason = authored.filter((i) => {
      const incidentDate = new Date(i.time);
      return incidentDate >= seasonStartDate;
    });

    const { totalAssets, incidentsWithAssets, eventStats, allAssetIds } =
      computeAssetStats(authoredThisSeason);

    const topEvent = eventStats[0] ?? null;

    // Pick 2 random assets and load their local data
    const randomPicks = pickRandom(allAssetIds, 2);
    const randomAssets: LoadedAsset[] = await Promise.all(
      randomPicks.map(async ({ id }) => {
        const localAsset = await getLocalAsset(id);
        return {
          id,
          localAsset: localAsset ?? null,
        };
      })
    );

    return {
      totalAssets,
      incidentsWithAssets,
      topEvent,
      randomAssets,
    };
  },
});
