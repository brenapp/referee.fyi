import { useParams } from "react-router-dom";
import { useCurrentDivision, useCurrentEvent } from "../../utils/hooks/state";
import { useEventMatch, useEventMatches } from "../../utils/hooks/robotevents";
import { LinkButton } from "../../components/Button";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { MatchContext } from "../../components/Context";
import { Spinner } from "../../components/Spinner";

export const EventMatchPage: React.FC = () => {
  const { matchId } = useParams();
  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();

  const { data: matches } = useEventMatches(event, division);
  const { data: match } = useEventMatch(
    event,
    division,
    matchId ? parseInt(matchId) : undefined
  );

  const prevMatch = useMemo(() => {
    return matches?.find((_, i) => matches[i + 1]?.id === match?.id);
  }, [matches, match]);

  const nextMatch = useMemo(() => {
    return matches?.find((_, i) => matches[i - 1]?.id === match?.id);
  }, [matches, match]);

  return (
    <section className="mt-4">
      <nav className="flex items-center">
        <LinkButton
          to={`/${event?.sku}/${division}/match/${prevMatch?.id}`}
          className={twMerge(
            "bg-transparent",
            prevMatch ? "visible" : "invisible"
          )}
        >
          <ArrowLeftIcon height={24} />
        </LinkButton>
        <h1 className="flex-1 text-xl text-center">{match?.name}</h1>
        <LinkButton
          to={`/${event?.sku}/${division}/match/${nextMatch?.id}`}
          className={twMerge(
            "bg-transparent",
            nextMatch ? "visible" : "invisible"
          )}
        >
          <ArrowRightIcon height={24} />
        </LinkButton>
      </nav>
      <Spinner show={!match} />
      <div className="mt-4">
        {match && (
          <MatchContext
            match={match}
            className="w-full"
            allianceClassName="w-full"
          />
        )}
      </div>
    </section>
  );
};
