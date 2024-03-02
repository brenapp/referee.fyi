import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useCallback } from "react";
import { Button } from "~components/Button";
import { useShareUserId } from "~utils/hooks/share";

export const SettingsPage: React.FC = () => {
  const { data: userSecret } = useShareUserId();

  const onClickCopyBuild = useCallback(() => {
    if (userSecret) navigator.clipboard.writeText(userSecret);
  }, [userSecret]);

  return (
    <main className="mt-4">
      <section className="mt-4">
        <h2 className="font-bold">User Secret</h2>
        <p>
          This secret uniquely identifies you when connecting to the share
          server, and may be required to join trusted events.
        </p>
        <Button
          mode="normal"
          className="font-mono text-left mt-2 flex items-center gap-2 active:bg-zinc-500"
          onClick={onClickCopyBuild}
        >
          <DocumentDuplicateIcon height={20} />
          <span>{userSecret}</span>
        </Button>
      </section>
      <section className="mt-4">
        <h2 className="font-bold">Delete RobotEvents Data</h2>
        <p>Delete all cached match lists, team lists, and event records.</p>
        <Button className="mt-2" mode="dangerous">
          Delete Cache
        </Button>
      </section>
    </main>
  );
};
