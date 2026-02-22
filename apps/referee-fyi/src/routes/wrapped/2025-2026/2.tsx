import { UserGroupIcon, UsersIcon } from "@heroicons/react/24/solid";
import type { InvitationListItem, User } from "@referee-fyi/share";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AnimatePresence, m } from "motion/react";
import { getAllInvitationsForUser, getShareProfile } from "~utils/data/share";
import { useEvent } from "~utils/hooks/robotevents";
import { WrappedNav } from "../-components";

type InvitationData = {
	sku: string;
	admin: boolean;
	accepted: boolean;
	from: User;
	users: InvitationListItem[];
};

type CollaboratorStats = {
	user: User;
	count: number;
};

function computeCollaboratorStats(
	invitations: InvitationData[],
	currentUserKey: string,
): CollaboratorStats[] {
	const collaboratorCounts: Record<string, { user: User; count: number }> = {};

	for (const invitation of invitations) {
		for (const item of invitation.users) {
			if (item.user.key === currentUserKey) continue;
			if (!collaboratorCounts[item.user.key]) {
				collaboratorCounts[item.user.key] = { user: item.user, count: 0 };
			}
			collaboratorCounts[item.user.key].count++;
		}
	}

	return Object.values(collaboratorCounts).sort((a, b) => b.count - a.count);
}

const TopInstanceCard: React.FC<{
	sku: string;
	userCount: number;
}> = ({ sku, userCount }) => {
	const { data: eventData } = useEvent(sku);

	return (
		<m.div
			className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.6, duration: 0.5 }}
		>
			<p className="text-lg">{eventData?.name ?? sku}</p>
			{eventData?.sku && (
				<code className="mono text-sm text-emerald-400">{eventData.sku}</code>
			)}
			<p className="text-zinc-400 text-sm mt-1">{userCount} collaborators</p>
		</m.div>
	);
};

const CollaboratorRow: React.FC<{
	collaborator: CollaboratorStats;
	index: number;
	maxCount: number;
}> = ({ collaborator, index, maxCount }) => {
	const percentage = maxCount > 0 ? (collaborator.count / maxCount) * 100 : 0;

	return (
		<m.div
			className="relative overflow-hidden rounded-lg bg-zinc-700/50 border border-zinc-600/50"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.9 + index * 0.08, duration: 0.4 }}
		>
			<m.div
				className="absolute inset-y-0 left-0 bg-purple-500/30"
				initial={{ width: 0 }}
				animate={{ width: `${percentage}%` }}
				transition={{
					delay: 1.1 + index * 0.08,
					duration: 0.6,
					ease: "easeOut",
				}}
			/>
			<div className="relative flex items-center justify-between px-4 py-2">
				<span className="text-zinc-200">{collaborator.user.name}</span>
				<span className="font-mono text-zinc-400">
					{collaborator.count} {collaborator.count === 1 ? "event" : "events"}
				</span>
			</div>
		</m.div>
	);
};

export const Two: React.FC = () => {
	const { invitations, topInstance, collaborators } = Route.useLoaderData();

	const hasInstances = invitations.length > 0;
	const topCollaborators = collaborators.slice(0, 5);
	const maxCollaboratorCount = topCollaborators[0]?.count ?? 0;

	return (
		<AnimatePresence>
			<div className="relative z-10 flex flex-col gap-6 px-6 pt-16 pb-8 w-full">
				<WrappedNav
					backTo="/wrapped/2025-2026/1"
					nextTo="/wrapped/2025-2026/3"
					current={2}
					total={4}
				/>

				{/* Header */}
				<m.div
					className="text-center"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					<m.h1
						className="text-4xl md:text-5xl font-bold text-white mb-2"
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.2, duration: 0.5 }}
					>
						<UserGroupIcon className="w-10 h-10 inline-block mr-2 text-purple-400" />
						<span className="text-purple-400">{invitations.length}</span>{" "}
						{invitations.length === 1 ? "Shared Instance" : "Shared Instances"}
					</m.h1>
					<m.p
						className="text-zinc-400"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4, duration: 0.5 }}
					>
						Shared instances you joined.
					</m.p>
				</m.div>
				{hasInstances ? (
					<>
						{topInstance && (
							<m.section
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.5, duration: 0.5 }}
							>
								<m.h2
									className="text-lg font-semibold text-zinc-300 mb-3"
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.55, duration: 0.4 }}
								>
									Largest Group
								</m.h2>
								<TopInstanceCard
									sku={topInstance.sku}
									userCount={topInstance.userCount}
								/>
							</m.section>
						)}

						{topCollaborators.length > 0 && (
							<m.section
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.7, duration: 0.5 }}
							>
								<m.h2
									className="text-lg font-semibold text-zinc-300 mb-3"
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.75, duration: 0.4 }}
								>
									<UsersIcon className="w-5 h-5 inline-block mr-2" />
									Frequent Collaborators
								</m.h2>
								<div className="flex flex-col gap-2">
									{topCollaborators.map((collaborator, index) => (
										<CollaboratorRow
											key={collaborator.user.key}
											collaborator={collaborator}
											index={index}
											maxCount={maxCollaboratorCount}
										/>
									))}
								</div>
							</m.section>
						)}
					</>
				) : (
					<m.div
						className="text-center py-8"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.5, duration: 0.5 }}
					>
						<UserGroupIcon className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
						<p className="text-zinc-400">No shared instances yet</p>
						<p className="text-zinc-500 text-sm mt-2">
							Join or create a shared instance to collaborate with others!
						</p>
					</m.div>
				)}
			</div>
		</AnimatePresence>
	);
};

export const Route = createFileRoute("/wrapped/2025-2026/2")({
	component: Two,
	loader: async () => {
		const response = await getAllInvitationsForUser();
		if (!response.success) {
			throw redirect({ to: "/wrapped/2025-2026/3" });
		}

		const invitations = response.data.invitations;
		const profile = await getShareProfile();

		// Find instance with most users
		const topInstance =
			invitations.length > 0
				? invitations.reduce(
						(max, inv) => {
							const userCount = inv.users.length;
							return userCount > max.userCount
								? { sku: inv.sku, userCount }
								: max;
						},
						{ sku: invitations[0].sku, userCount: invitations[0].users.length },
					)
				: null;

		// Compute collaborator stats
		const collaborators = computeCollaboratorStats(invitations, profile.key);

		return { invitations, topInstance, collaborators };
	},
});
