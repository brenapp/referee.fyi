import { GlobeAmericasIcon } from "@heroicons/react/20/solid";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "~components/Button";
import { ClickToCopy } from "~components/ClickToCopy";
import { Input } from "~components/Input";
import { toast } from "~components/Toast";
import { queryClient } from "~utils/data/query";
import { isWorldsBuild } from "~utils/data/state";
import { useShareID, useShareProfile } from "~utils/hooks/share";

async function clearCache() {
  // Invalidate All Queries
  await queryClient.invalidateQueries({ type: "all" });

  // Clear Service Worker Cache
  if ("serviceWorker" in navigator) {
    caches.keys().then(function (cacheNames) {
      cacheNames.forEach(function (cacheName) {
        caches.delete(cacheName);
      });
    });
  }
}

export const SettingsPage: React.FC = () => {
  const { name, setName, persist } = useShareProfile();
  const { data: publicKey } = useShareID();

  const navigate = useNavigate();

  const onClickRemoveRobotEvents = useCallback(async () => {
    await clearCache();
    toast({ type: "info", message: "Deleted cache." });
    navigate("/");
  }, [navigate]);

  return (
    <main className="mt-4">
      {isWorldsBuild() ? (
        <p className="bg-purple-500 text-zinc-300 p-2 rounded-md flex items-center gap-2 mt-2">
          <GlobeAmericasIcon height={20} />
          Worlds Build
          <span className="flex-1 text-right font-mono">
            {__REFEREE_FYI_VERSION__}
          </span>
        </p>
      ) : null}
      <section className="mt-4">
        <h2 className="font-bold">Name</h2>
        <Input
          className="w-full"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onBlur={() => persist()}
        />
      </section>
      <section className="mt-4">
        <h2 className="font-bold">Public Key</h2>
        <ClickToCopy message={publicKey ?? ""} />
      </section>
      <section className="mt-4">
        <h2 className="font-bold">Delete Cache</h2>
        <p>
          Delete all cached assets and RobotEvents data. This will not remove
          any locally stored incidents.
        </p>
        <Button
          className="mt-2"
          mode="dangerous"
          onClick={onClickRemoveRobotEvents}
        >
          Delete Cache
        </Button>
      </section>
    </main>
  );
};

export default SettingsPage;
