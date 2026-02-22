import { Ranking, Skill, Team } from "robotevents";

export type TeamExcellenceEligibilityCriterion = {
    eligible: boolean;
    reason: string;
    rank: number;
};

export type TeamSkillsExcellenceEligibilityCriterion =
    & TeamExcellenceEligibilityCriterion
    & {
        score: number;
    };

export type TeamExcellenceEligibility = {
    team: Team;
    eligible: boolean;
    ranking: TeamExcellenceEligibilityCriterion;
    autoSkills: TeamSkillsExcellenceEligibilityCriterion;
    skills: TeamSkillsExcellenceEligibilityCriterion;
};

export type TeamRecord = {
    driver: Skill | null;
    programming: Skill | null;
    overall: number;
};

export type GetTeamEligibilityArgs = {
    team: Team;
    rankings: Ranking[];
    autoRankings: TeamRecord[];
    skills: TeamRecord[];
    rankingThreshold: number;
    skillsThreshold: number;
};

export function getTeamExcellenceAwardEligibility({
    team,
    rankings,
    autoRankings,
    skills,
    rankingThreshold,
    skillsThreshold,
}: GetTeamEligibilityArgs): TeamExcellenceEligibility {
    // Top 40% of teams at the conclusion of qualifying matches
    let rankingCriterion = { eligible: false, rank: 0, reason: "" };
    const qualifyingRank =
        rankings.findIndex((ranking) => ranking.team?.id === team.id) + 1;

    if (!qualifyingRank) {
        rankingCriterion = {
            eligible: false,
            rank: qualifyingRank,
            reason: "No Data",
        };
    } else if (qualifyingRank > rankingThreshold) {
        rankingCriterion = {
            eligible: false,
            rank: qualifyingRank,
            reason: `Rank ${qualifyingRank}`,
        };
    } else {
        rankingCriterion = {
            eligible: true,
            rank: qualifyingRank,
            reason: `Rank ${qualifyingRank}`,
        };
    }

    // Top 40% of autonomous coding skills
    let autoSkillsCriterion = {
        eligible: false,
        reason: "",
        rank: 0,
        score: 0,
    };
    const autoSkillsRank = autoRankings.findIndex(
        (ranking) => ranking.programming?.team?.id === team.id,
    ) + 1;
    const autoSkillsRecord = autoRankings[autoSkillsRank - 1]?.programming;

    if (!autoSkillsRank || !autoSkillsRecord) {
        autoSkillsCriterion = {
            eligible: false,
            reason: "No Data",
            rank: 0,
            score: 0,
        };
    } else if ((autoSkillsRecord.score ?? 0) < 1) {
        autoSkillsCriterion = {
            eligible: false,
            rank: autoSkillsRank,
            score: autoSkillsRecord.score ?? 0,
            reason: `Zero Score`,
        };
    } else if (autoSkillsRank > skillsThreshold) {
        autoSkillsCriterion = {
            eligible: false,
            rank: autoSkillsRank,
            score: autoSkillsRecord.score ?? 0,
            reason: `Auto Skills Rank ${autoSkillsRank} [score: ${
                autoSkillsRecord.score ?? 0
            }]`,
        };
    } else {
        autoSkillsCriterion = {
            eligible: true,
            rank: autoSkillsRank,
            score: autoSkillsRecord.score ?? 0,
            reason: `Auto Skills Rank ${autoSkillsRank} [score: ${
                autoSkillsRecord.score ?? 0
            }]`,
        };
    }

    // Top 40% of overall skills
    let skillsCriterion = { eligible: false, reason: "", rank: 0, score: 0 };
    const overallSkillsRank = skills.findIndex((record) => {
        const number = record.driver?.team?.id ?? record.programming?.team?.id;
        return number === team.id;
    }) + 1;
    const skillsRecord = skills?.[overallSkillsRank - 1]?.overall;

    if (!overallSkillsRank || !skillsRecord) {
        skillsCriterion = {
            eligible: false,
            reason: "No Data",
            rank: 0,
            score: 0,
        };
    } else if (skillsRecord < 1) {
        skillsCriterion = {
            eligible: false,
            rank: overallSkillsRank,
            score: skillsRecord,
            reason: `Zero Score`,
        };
    } else if (overallSkillsRank > skillsThreshold) {
        skillsCriterion = {
            eligible: false,
            rank: overallSkillsRank,
            score: skillsRecord,
            reason:
                `Overall Skills Rank ${overallSkillsRank} [score: ${skillsRecord}]`,
        };
    } else {
        skillsCriterion = {
            eligible: true,
            rank: overallSkillsRank,
            score: skillsRecord,
            reason:
                `Overall Skills Rank ${overallSkillsRank} [score: ${skillsRecord}]`,
        };
    }

    const eligible = rankingCriterion.eligible &&
        autoSkillsCriterion.eligible &&
        skillsCriterion.eligible;

    return {
        team,
        eligible,
        ranking: rankingCriterion,
        autoSkills: autoSkillsCriterion,
        skills: skillsCriterion,
    };
}

export type GetTeamExcellenceAwardEligibilityListArgs = {
    teams: Team[];
    rankings: Ranking[];
    skills: TeamRecord[];
    rankingThreshold: number;
    skillsThreshold: number;
};

export function getTeamExcellenceEligibilityList({
    teams,
    rankings,
    skills,
    rankingThreshold,
    skillsThreshold,
}: GetTeamExcellenceAwardEligibilityListArgs): TeamExcellenceEligibility[] {
    const autoRankings = [...skills].sort(
        (a, b) => (b.programming?.score ?? 0) - (a.programming?.score ?? 0),
    );

    return teams.map((team) =>
        getTeamExcellenceAwardEligibility({
            team,
            rankings,
            autoRankings,
            skills,
            rankingThreshold,
            skillsThreshold,
        })
    );
}
