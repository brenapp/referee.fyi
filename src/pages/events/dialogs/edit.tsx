import { TrashIcon } from "@heroicons/react/20/solid";
import { useCallback, useState } from "react";
import { Button } from "~components/Button";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { Select, TextArea } from "~components/Input";
import { DialogMode } from "~components/constants";
import { IncidentWithID, deleteIncident } from "~utils/data/incident";
import { queryClient } from "~utils/data/query";
import { useCurrentEvent } from "~utils/hooks/state";

export type EditIncidentDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  incident: IncidentWithID;
};

export const EditIncidentDialog: React.FC<EditIncidentDialogProps> = ({
  open,
  setOpen,
  incident,
}) => {
  const [currentIncident, setCurrentIncident] = useState(incident);
  const { data: event } = useCurrentEvent();

  const setIncidentField = <T extends keyof IncidentWithID>(
    key: T,
    value: IncidentWithID[T]
  ) => {
    setCurrentIncident((i) => ({
      ...i,
      [key]: value,
    }));
  };

  const onClickDelete = useCallback(async () => {
    await deleteIncident(incident.id);
    queryClient.invalidateQueries({
      queryKey: ["incidents"],
    });
  }, []);

  const onChangeIncidentDivision = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const div = Number.parseInt(e.currentTarget.value);

      if (isNaN(div)) {
        e.preventDefault();
        return;
      }
      setIncidentField("division", div);
    },
    []
  );

  const onChangeIncidentNotes = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setIncidentField("notes", e.target.value);
    },
    []
  );

  return (
    <Dialog open={open} onClose={() => setOpen(false)} mode={DialogMode.Modal}>
      <DialogHeader
        title="Edit Incident"
        onClose={() => setOpen(false)}
      ></DialogHeader>
      <DialogBody>
        <Button
          className="bg-red-400 w-full text-center"
          onClick={onClickDelete}
        >
          <TrashIcon height={20} className="inline mr-2" />
          Delete Incident
        </Button>
        <label>
          <p className="mt-4">Notes</p>
          <TextArea
            className="w-full mt-2 h-32"
            value={incident.notes}
            onChange={onChangeIncidentNotes}
          />
        </label>
      </DialogBody>
    </Dialog>
  );
};
