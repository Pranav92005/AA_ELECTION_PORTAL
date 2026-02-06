import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getSupabaseServerClient } from "@/lib/supabaseServer"

export async function POST(req: Request) {
  try {
    const { electionId } = await req.json()

    if (!electionId) {
      return NextResponse.json(
        { error: "electionId required" },
        { status: 400 }
      )
    }

    /* ================= AUTH CHECK ================= */
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    /* ================= ADMIN ROLE CHECK ================= */
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admin can publish results" },
        { status: 403 }
      )
    }

    /* ================= CHECK PRESIDENT VOTE ================= */
    const { data: election } = await supabaseAdmin
      .from("elections")
      .select("president_vote_required")
      .eq("id", electionId)
      .single()

    if (election?.president_vote_required) {
      const { data: pv } = await supabaseAdmin
        .from("president_votes")
        .select("id")
        .eq("election_id", electionId)

      if (!pv || pv.length === 0) {
        return NextResponse.json(
          { error: "President vote pending" },
          { status: 400 }
        )
      }
    }

    /* ================= PREVENT DUPLICATE APPROVAL ================= */
    const { data: existing } = await supabaseAdmin
      .from("approval_requests")
      .select("id")
      .eq("election_id", electionId)
      .eq("action_type", "PUBLISH_RESULTS")
      .eq("status", "PENDING")
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: "Approval already pending" },
        { status: 400 }
      )
    }

    /* ================= CREATE APPROVAL REQUEST ================= */
    const { error } = await supabaseAdmin
      .from("approval_requests")
      .insert({
        election_id: electionId,
        action_type: "PUBLISH_RESULTS",
        status: "PENDING",
        requested_by: user.id,
        payload: {} // ✅ Fix NOT NULL constraint
      })

    if (error) throw error

    return NextResponse.json({
      status: "PENDING_OBSERVER_APPROVAL"
    })

  } catch (err) {
    console.error("PUBLISH RESULTS ERROR:", err)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
