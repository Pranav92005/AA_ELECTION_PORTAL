interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ElectionResultsPage({ params }: PageProps) {
  const { id } = await params

  // Mock election and results data
  const election = {
    id,
    title: "Student Government Elections",
    academicYear: "2024-2025",
    description: "Official results for this election",
    isPublished: true,
  }

  const results = [
    {
      position: "President",
      candidates: [
        {
          id: "1",
          name: "Alex Johnson",
          department: "Computer Science",
          batch: "2024",
          voteCount: 234,
          isWinner: true,
        },
        { id: "2", name: "Jordan Smith", department: "Engineering", batch: "2024", voteCount: 198, isWinner: false },
        { id: "3", name: "Casey Brown", department: "Business", batch: "2023", voteCount: 156, isWinner: false },
      ],
    },
    {
      position: "Vice President",
      candidates: [
        { id: "4", name: "Taylor Lee", department: "Science", batch: "2023", voteCount: 267, isWinner: true },
        { id: "5", name: "Morgan Davis", department: "Arts", batch: "2024", voteCount: 189, isWinner: false },
      ],
    },
    {
      position: "General Secretary",
      candidates: [
        { id: "6", name: "Riley Chen", department: "Engineering", batch: "2023", voteCount: 312, isWinner: true },
        { id: "7", name: "Alex Martinez", department: "Commerce", batch: "2024", voteCount: 214, isWinner: false },
        { id: "8", name: "Sam Wilson", department: "Science", batch: "2024", voteCount: 187, isWinner: false },
      ],
    },
    {
      position: "Treasurer",
      candidates: [
        { id: "9", name: "Jordan Patel", department: "Business", batch: "2023", voteCount: 298, isWinner: true },
        { id: "10", name: "Casey Thompson", department: "Engineering", batch: "2024", voteCount: 205, isWinner: false },
      ],
    },
    {
      position: "Cultural Coordinator",
      candidates: [
        { id: "11", name: "Sydney Roberts", department: "Arts", batch: "2023", voteCount: 276, isWinner: true },
        { id: "12", name: "Morgan Khan", department: "Business", batch: "2024", voteCount: 241, isWinner: false },
        { id: "13", name: "Jordan Garcia", department: "Science", batch: "2024", voteCount: 199, isWinner: false },
      ],
    },
  ]

  const totalVotes = results.reduce((sum, pos) => sum + Math.max(...pos.candidates.map((c) => c.voteCount)), 0)

  const getVotePercentage = (voteCount: number) => {
    if (totalVotes === 0) return 0
    return ((voteCount / totalVotes) * 100).toFixed(1)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{election.title}</h1>
            <span className="inline-block rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
              Results Published
            </span>
          </div>
          <p className="text-muted-foreground">{election.academicYear}</p>
          <p className="mt-2 text-foreground">{election.description}</p>
        </div>

        {/* Not Published State */}
        {!election.isPublished && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Results will be available once officially published.</p>
          </div>
        )}

        {/* Results Display */}
        {election.isPublished && (
          <div className="space-y-8">
            {results.map((position) => (
              <div key={position.position}>
                {/* Position Title */}
                <h2 className="mb-4 text-xl font-semibold text-foreground">{position.position}</h2>

                {/* Candidates Results */}
                <div className="space-y-3">
                  {position.candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className={`rounded-lg border p-6 transition-colors ${
                        candidate.isWinner ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      {/* Candidate Info */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className={`font-semibold ${candidate.isWinner ? "text-primary" : "text-foreground"}`}>
                              {candidate.name}
                            </h3>
                            {candidate.isWinner && (
                              <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                                Winner
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {candidate.department} • Batch {candidate.batch}
                          </p>

                          {/* Vote Progress Bar */}
                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">{candidate.voteCount} votes</span>
                              <span className="text-sm font-medium text-foreground">
                                {getVotePercentage(candidate.voteCount)}%
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className={`h-full transition-all ${candidate.isWinner ? "bg-primary" : "bg-primary/50"}`}
                                style={{
                                  width: `${getVotePercentage(candidate.voteCount)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
