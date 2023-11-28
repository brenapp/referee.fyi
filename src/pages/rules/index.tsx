import { ProgramAbbr } from "robotevents/out/endpoints/programs";
import { LinkButton } from "../../components/Button";
import { twMerge } from "tailwind-merge";

export const RulesPage: React.FC = () => {
  const programs: ProgramAbbr[] = ["VRC", "VIQRC", "VEXU", "VAIC"];

  const programClassName: Record<ProgramAbbr, string> = {
    VRC: "bg-red-400",
    VIQRC: "bg-blue-400",
    VEXU: "bg-zinc-900 text-white",
    VAIC: "bg-zinc-300 text-black",
    WORKSHOP: "",
    NRL: "",
    ADC: "",
    TVRC: "",
    TVIQRC: "",
    VRAD: "",
    BellAVR: "",
    FAC: "",
  };

  return (
    <section className="mt-4 flex flex-col gap-4">
      {programs.map((program) => (
        <LinkButton
          to={`/rules/${program}`}
          key={program}
          className={twMerge(programClassName[program], "text-center")}
        >
          {program}
        </LinkButton>
      ))}
    </section>
  );
};
