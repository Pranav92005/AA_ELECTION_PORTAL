"use client"

import React, { use } from "react"
import { useEffect, useState } from "react"
import axios from "axios"

/* ================= TYPES ================= */

interface SnapshotRow {
  position_id: number
  position_name: string
  candidate_user_id: string
  candidate_name: string
  vote_count: number
  is_tie: boolean
}

interface PageProps {
  params: Promise<{ id: string }> // ✅ MUST be Promise
}

export default function ElectionResultsPage({ params }: PageProps) {
  const { id: electionId } = use(params) // ✅ REQUIRED FIX

  const [snapshot, setSnapshot] = useState<SnapshotRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  /* ================= FETCH SNAPSHOT ================= */

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const res = await axios.get<SnapshotRow[]>(
          `/api/admin/results/snapshot?electionId=${electionId}`,
          { headers: { "Cache-Control": "no-store" } }
        )
        setSnapshot(res.data)
      } catch (err) {
        console.error("Failed to fetch results", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchSnapshot()
  }, [electionId])

  /* ================= UI STATES ================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading results…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">
          Results are not available.
        </p>
      </div>
    )
  }

  /* ================= GROUP SNAPSHOT ================= */

  const grouped: Record<number, any> = {}

  snapshot.forEach(row => {
    if (!grouped[row.position_id]) {
      grouped[row.position_id] = {
        positionId: row.position_id,
        position: row.position_name,
        hadTie: false,
        candidates: [],
      }
    }

    if (row.is_tie) grouped[row.position_id].hadTie = true

    grouped[row.position_id].candidates.push({
      id: row.candidate_user_id,
      name: row.candidate_name,
      voteCount: row.vote_count,
      isWinner: !row.is_tie,
    })
  })

  const results = Object.values(grouped)

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">
          Election Results
        </h1>

        <div className="space-y-8">
          {results.map((position: any) => (
            <div key={position.positionId}>
              <h2 className="mb-4 text-xl font-semibold">
                {position.position}
              </h2>

              <div className="space-y-3">
                {position.candidates.map((c: any) => {
                  const wonByPresident = c.isWinner && position.hadTie

                  return (
                    <div
                      key={c.id}
                      className={`rounded-lg border p-6 ${
                        c.isWinner
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{c.name}</h3>
                        {c.isWinner && (
                          <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
                            {wonByPresident
                              ? "Winner (President Vote)"
                              : "Winner"}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {c.voteCount} votes
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
