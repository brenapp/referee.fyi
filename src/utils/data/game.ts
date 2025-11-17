import { ProgramCode, programs } from "robotevents";

export function programHasAutonomousPeriod(program?: ProgramCode | number) {
  switch (program) {
    case programs.V5RC:
    case programs.VURC:
      return true;
    default:
      return false;
  }
}

export function programHasIsolationPeriod(program: ProgramCode) {
  switch (program) {
    case programs.VAIRC:
      return true;
    default:
      return false;
  }
}
