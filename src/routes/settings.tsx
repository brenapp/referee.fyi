import { ArrowRightIcon, GlobeAmericasIcon } from "@heroicons/react/20/solid";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button, LinkButton } from "~components/Button";
import { ClickToCopy } from "~components/ClickToCopy";
import { ReportIssueDialog } from "~components/dialogs/report";
import { Input } from "~components/Input";
import { toast } from "~components/Toast";
import { Info } from "~components/Warning";
import { useShareConnection } from "~models/ShareConnection";
import { isWorldsBuild } from "~utils/data/state";
import { clearCache } from "~utils/sentry";

export const SettingsPage: React.FC = () => {
  const { updateProfile, profile, userMetadata } = useShareConnection([
    "updateProfile",
    "profile",
    "userMetadata",
  ]);
  const [localName, setLocalName] = useState(profile?.name ?? "");

  useEffect(() => {
    if (profile?.name) {
      setLocalName(profile.name);
    }
  }, [profile?.name]);

  const [reportIssueDialogOpen, setReportIssueDialogOpen] = useState(false);

  const onClickRemoveRobotEvents = useCallback(async () => {
    await clearCache();
    toast({ type: "info", message: "Deleted cache." });

    window.location.reload();
  }, []);

  return (
    <main className="mt-4 overflow-y-auto">
      {isWorldsBuild() ? (
        <p className="bg-purple-500 text-zinc-300 p-2 rounded-md flex items-center gap-2 mt-4">
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
          value={localName}
          onChange={(e) => setLocalName(e.currentTarget.value)}
          onBlur={() => updateProfile({ name: localName })}
        />
      </section>
      <section className="mt-4">
        <h2 className="font-bold">Public Key</h2>
        <ClickToCopy message={profile?.key ?? ""} />
      </section>
      {userMetadata.isSystemKey ? (
        <Info message="System Key Enabled" className="mt-4" />
      ) : null}
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
      <section className="mt-4">
        <h2 className="font-bold">Legal</h2>
        <p className="mt-2"></p>
        <LinkButton to="/privacy" className="w-full flex items-center mt-2">
          <span className="flex-1">Privacy Policy</span>
          <ArrowRightIcon height={20} className="text-emerald-400" />
        </LinkButton>
      </section>
    </main>
  );
};

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
