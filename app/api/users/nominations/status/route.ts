// app/api/user/nominations/status/route.ts
import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  try {
    /* =========================
       AUTH
       ========================= */
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    /* =========================
       FETCH NOMINATIONS
       ========================= */
    const { data: nominations, error } = await supabaseAdmin
      .from("nominations")
      .select("id, election_id, position_id, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error
    if (!nominations || nominations.length === 0) {
      return NextResponse.json([])
    }

    const nominationIds = nominations.map(n => n.id)
    const electionIds = [...new Set(nominations.map(n => n.election_id))]
    const positionIds = [...new Set(nominations.map(n => n.position_id))]

    /* =========================
       FETCH ELECTIONS & POSITIONS
       ========================= */
    const { data: elections } = await supabaseAdmin
      .from("elections")
      .select("id, title")
      .in("id", electionIds)

    const { data: positions } = await supabaseAdmin
      .from("positions")
      .select("id, name")
      .in("id", positionIds)

    const electionMap = new Map(elections?.map(e => [e.id, e.title]))
    const positionMap = new Map(positions?.map(p => [p.id, p.name]))

    /* =========================
       FETCH SUPPORTER APPROVALS
       ========================= */
    const { data: supporters, error: supportersError } = await supabaseAdmin
      .from("nomination_supporter_tokens")
      .select("nomination_id, role, approved, approved_at")
      .in("nomination_id", nominationIds)

    if (supportersError) throw supportersError

    const supporterStatus = (
      nominationId: string,
      role: "PROPOSER" | "SECONDER"
    ): "completed" | "pending" => {
      const row = supporters?.find(
        s => s.nomination_id === nominationId && s.role === role
      )
      if (!row) return "pending"
      return row.approved ? "completed" : "pending"
    }

    /* =========================
       FETCH ADMIN / OBSERVER
       ========================= */
    const { data: approvals } = await supabaseAdmin
      .from("approval_requests")
      .select("entity_id, status, action_type")
      .eq("entity_type", "NOMINATION")
      .in("entity_id", nominationIds)

    /* =========================
       BUILD RESPONSE (UI SAFE)
       ========================= */
    const response = nominations.map(n => {
      const proposer = supporterStatus(n.id, "PROPOSER")
      const seconder = supporterStatus(n.id, "SECONDER")

      const admin = approvals?.find(
        a =>
          a.entity_id === n.id &&
          a.action_type === "NOMINATION_DECISION"
      )

      const observer = approvals?.find(
        a =>
          a.entity_id === n.id &&
          a.action_type === "OBSERVER_DECISION"
      )

      const adminStatus =
        admin?.status === "REJECTED"
          ? "rejected"
          : admin?.status === "APPROVED"
          ? "completed"
          : "pending"

      const observerStatus =
        observer?.status === "REJECTED"
          ? "rejected"
          : observer?.status === "APPROVED"
          ? "completed"
          : "pending"

      const overallStatus =
        admin?.status === "REJECTED" || observer?.status === "REJECTED"
          ? "rejected"
          : admin?.status === "APPROVED" &&
            observer?.status === "APPROVED"
          ? "approved"
          : "pending"

      return {
        id: n.id,
        electionName: electionMap.get(n.election_id) || "Election",
        position: positionMap.get(n.position_id) || "Position",
        overallStatus,
        approvalSteps: [
          { step: 1, label: "Proposer Approval", status: proposer },
          { step: 2, label: "Seconder Approval", status: seconder },
          { step: 3, label: "Election Officer Approval", status: adminStatus },
          { step: 4, label: "Observer Approval", status: observerStatus },
        ],
      }
    })

    return NextResponse.json(response)
  } catch (err) {
    console.error("NOMINATION STATUS ERROR:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
