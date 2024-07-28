import { GlobeAmericasIcon } from "@heroicons/react/20/solid";
import { useCallback, useRef, useState } from "react";
import { Button } from "~components/Button";
import { ClickToCopy } from "~components/ClickToCopy";
import { ReportIssueDialog } from "~components/dialogs/report";
import { Input } from "~components/Input";
import { toast } from "~components/Toast";
import { addManyIncidents } from "~utils/data/incident";
import { queryClient } from "~utils/data/query";
import { isWorldsBuild } from "~utils/data/state";
import { useShareID, useShareProfile } from "~utils/hooks/share";

async function clearCache() {
  // Invalidate All Queries
  await queryClient.invalidateQueries({ type: "all" });

  // Unregister Service Workers
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
}

export const SettingsPage: React.FC = () => {
  const { name, setName, persist } = useShareProfile();
  const { data: publicKey } = useShareID();

  const [reportIssueDialogOpen, setReportIssueDialogOpen] = useState(false);

  const onClickRemoveRobotEvents = useCallback(async () => {
    await clearCache();
    toast({ type: "info", message: "Deleted cache." });

    window.location.reload();
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importIncidents = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const array = await file.arrayBuffer();
    const text = new TextDecoder().decode(array);

    try {
      const { incidents } = JSON.parse(text);
      await addManyIncidents(incidents);

      toast({
        type: "info",
        message: `Imported ${incidents.length} incidents`,
      });
    } catch (e) {
      toast({
        type: "error",
        message: "Failed to import incidents.",
        context: JSON.stringify(e),
      });
    }
  }, [fileInputRef]);

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
          className="w-full mt-2"
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
        <h2 className="font-bold">Report Issues with Referee FYI</h2>
        <p>
          Information about your current session will be included in your report
        </p>
        <ReportIssueDialog
          open={reportIssueDialogOpen}
          setOpen={setReportIssueDialogOpen}
        />
        <Button className="mt-2" onClick={() => setReportIssueDialogOpen(true)}>
          Report Issue
        </Button>
      </section>
      {import.meta.env.DEV ? (
        <section className="mt-4">
          <h2 className="font-bold">Import Incidents</h2>
          <p>
            Developer Mode: Import incidents from JSON file. This will overwrite
            local changes.
          </p>
          <Input
            type="file"
            className="mt-2 w-full"
            accept=".json"
            ref={fileInputRef}
          />
          <Button className="mt-2" mode="primary" onClick={importIncidents}>
            Import
          </Button>
        </section>
      ) : null}
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
