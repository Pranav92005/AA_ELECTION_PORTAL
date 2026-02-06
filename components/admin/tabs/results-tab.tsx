"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import type { AdminElectionDetailsResponse } from "@/app/admin/elections/[id]/page"
import type { PendingApproval } from "../election-tabs"

/* ================= TYPES ================= */

interface SnapshotRow {
  position_id: number
  candidate_user_id: string
  vote_count: number
  is_tie: boolean
  position_name?: string
  candidate_name?: string
}

interface PositionResult {
  positionId: number
  positionName: string
  candidates: {
    candidateId: string
    candidateName: string
    voteCount: number
    isWinner: boolean
  }[]
}

interface ResultsTabProps {
  election: AdminElectionDetailsResponse | null
  userRole: "admin" | "observer"
  pendingApproval: PendingApproval | null
  refetchPendingApproval: () => void
}

/* ================= COMPONENT ================= */

export function ResultsTab({
  election,
  userRole,
  pendingApproval,
  refetchPendingApproval,
}: ResultsTabProps) {
  const [results, setResults] = useState<PositionResult[]>([])
  const [loading, setLoading] = useState(false)

  const [presidentVoteRequired, setPresidentVoteRequired] = useState(false)
  const [presidentVoteCompleted, setPresidentVoteCompleted] = useState(false)

  /* ================= FETCH SNAPSHOT ================= */

  const fetchSnapshot = async () => {
    if (!election?.election.id) return

    setLoading(true)
    try {
      const { data } = await axios.get(
        "/api/admin/results/snapshot",
        { params: { electionId: election.election.id } }
      )

      const grouped: Record<number, PositionResult> = {}

      data.forEach((row: SnapshotRow) => {
        if (!grouped[row.position_id]) {
          grouped[row.position_id] = {
            positionId: row.position_id,
            positionName: row.position_name ?? "Unknown",
            candidates: [],
          }
        }

        grouped[row.position_id].candidates.push({
          candidateId: row.candidate_user_id,
          candidateName: row.candidate_name ?? "Candidate",
          voteCount: row.vote_count,
          isWinner: !row.is_tie,
        })
      })

      setResults(Object.values(grouped))
    } catch (err) {
      console.error("Failed to load result snapshot", err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  /* ================= FETCH META ================= */

  const fetchMeta = async () => {
    if (!election) return

    const { data } = await axios.get(
      "/api/admin/elections/meta",
      { params: { electionId: election.election.id } }
    )

    setPresidentVoteRequired(Boolean(data.president_vote_required))
    setPresidentVoteCompleted(Boolean(data.president_vote_completed))
  }

  useEffect(() => {
    fetchSnapshot()
    fetchMeta()
  }, [election?.election.id])

  /* ================= DERIVED STATE ================= */

  const isVotingOngoing =
    election?.election.status === "VOTING"

  const resultPublished =
    election?.election.status === "RESULTS_PUBLISHED"

  const totalVoters = election?.stats.totalVoters ?? 0

  const hasTie = useMemo(() => {  
    return results.some(position =>
      position.candidates.some(c => !c.isWinner)
    )
  }, [results])

  const canPublishResults =
    !hasTie || presidentVoteCompleted

  const getVotePercentage = (votes: number) => {
    if (!totalVoters) return "0"
    return ((votes / totalVoters) * 100).toFixed(1)
  }

  /* ================= ADMIN ACTIONS ================= */

  const initiatePresidentVoteApproval = async () => {
    if (!election) return

    await axios.post(
      "/api/admin/elections/initiate-president-vote",
      { electionId: election.election.id }
    )

    refetchPendingApproval()
  }

  const initiatePublishApproval = async () => {
    if (!election) return

    await axios.post(
      "/api/admin/elections/publish-results",
      { electionId: election.election.id }
    )

    refetchPendingApproval()
  }

  /* ================= OBSERVER ACTIONS ================= */

  const approve = async () => {
    if (!pendingApproval) return
    console.log("Approving action:", pendingApproval)

    await axios.post("/api/admin/approvals/approve", {
      approvalRequestId: pendingApproval.id,
    })

    refetchPendingApproval()
    await fetchSnapshot()
    await fetchMeta()
  }

  const reject = async () => {
    if (!pendingApproval) return

    await axios.post("/api/admin/approvals/reject", {
      approvalId: pendingApproval.id,
    })

    refetchPendingApproval()
  }

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading results…
      </p>
    )
  }

  /* ================= PENDING APPROVAL ================= */

  if (pendingApproval) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-4 text-sm font-medium text-foreground">
          {pendingApproval.action_type ===
            "INITIATE_PRESIDENT_VOTE" &&
            "Admin requested approval to initiate President vote."}
          {pendingApproval.action_type ===
            "PUBLISH_RESULTS" &&
            "Admin requested approval to publish results."}
        </p>

        {userRole === "observer" && (
          <div className="flex gap-3">
            <button
              onClick={approve}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Approve
            </button>
            <button
              onClick={reject}
              className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive"
            >
              Reject
            </button>
          </div>
        )}

        {userRole === "admin" && (
          <p className="text-xs text-muted-foreground">
            Waiting for observer approval…
          </p>
        )}
      </div>
    )
  }

  /* ================= PRE-PUBLISH STATE ================= */

  if (!isVotingOngoing&&!resultPublished) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-4">
          {hasTie && !presidentVoteCompleted ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                A tie was detected. President vote is required.
              </p>
              
              {userRole === "admin" && presidentVoteRequired && (
                <button
                  onClick={initiatePresidentVoteApproval}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Initiate President Vote
                </button>
              )}
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Results are ready to be published.
              </p>
              {userRole === "admin" && canPublishResults && (
                <button
                  onClick={initiatePublishApproval}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Publish Results
                </button>
              )}
            </>
          )}

          {userRole === "observer" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Observers cannot initiate actions.
            </p>
          )}
        </div>
      </div>
    )
  }

  /* ================= FINAL RESULTS ================= */

  /* ================= FINAL RESULTS ================= */

return (
  <div className="space-y-6">
    {results.map(position => {

      const maxVotes = Math.max(
        ...position.candidates.map(c => c.voteCount)
      )

      const tiedCandidates = position.candidates.filter(
        c => c.voteCount === maxVotes
      )

      const tieResolvedByPresident =
        tiedCandidates.length > 1 && presidentVoteCompleted

      return (
        <div key={position.positionId}>
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            {position.positionName}
          </h3>

          <div className="space-y-3">
            {position.candidates.map(candidate => (
              <div
                key={candidate.candidateId}
                className={`rounded-lg border p-4 ${
                  candidate.isWinner
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-semibold">
                      {candidate.candidateName}
                    </h4>

                    {/* ⭐ Vote Count Only */}
                    <p className="text-sm text-muted-foreground">
                      {candidate.voteCount} votes
                    </p>
                  </div>

                  {candidate.isWinner && (
                    <span className="rounded-full  px-2  py-1 text-xs font-bold">
                      {tieResolvedByPresident
                        ? "Winner (President Decision)"
                        : "Winner"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    })}
  </div>
)

}
