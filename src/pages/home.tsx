import { LinkButton } from "~components/Button";
import { useRecentEvents } from "~utils/hooks/history";

export const HomePage: React.FC = () => {
  const { data: recentEvents } = useRecentEvents(5);

  return (
    <section className="mt-4 max-w-full">
      {recentEvents?.map((event) => (
        <LinkButton
          to={`/${event.sku}`}
          className="w-full max-w-full mt-4"
          key={event.sku}
        >
          <p className="text-sm ">
            <span className=" text-emerald-400 font-mono">{event.sku}</span>
          </p>
          <p className="">{event.name}</p>
        </LinkButton>
      ))}
    </section>
  );
};
