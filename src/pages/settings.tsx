import { GlobeAmericasIcon } from "@heroicons/react/20/solid";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useCallback } from "react";
import { Button, IconButton } from "~components/Button";
import { Input } from "~components/Input";
import { toast } from "~components/Toast";
import { queryClient } from "~utils/data/query";
import { isWorldsBuild } from "~utils/data/state";
import { useShareID, useShareProfile } from "~utils/hooks/share";

export const SettingsPage: React.FC = () => {
  const { name, setName, persist } = useShareProfile();
  const { data: publicKey } = useShareID();

  const onClickCopyKey = useCallback(() => {
    if (navigator.clipboard && publicKey) {
      navigator.clipboard.writeText(publicKey);
      toast({ type: "info", message: "Copied public key to clipboard!" });
    }
  }, [publicKey]);

  const onClickRemoveRobotEvents = useCallback(() => {
    queryClient.cancelQueries({ type: "all" });
    toast({ type: "info", message: "Deleted RobotEvents cache." });
  }, []);

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
        <div className="mt-2 flex gap-2 w-full">
          <IconButton
            className="p-3"
            onClick={onClickCopyKey}
            icon={<DocumentDuplicateIcon height={20} />}
          />
          <div className="p-3 px-4 text-ellipsis overflow-hidden bg-zinc-700 rounded-md flex-1">
            {publicKey}
          </div>
        </div>
      </section>
      <section className="mt-4">
        <h2 className="font-bold">Delete RobotEvents Data</h2>
        <p>Delete all cached match lists, team lists, and event records.</p>
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
