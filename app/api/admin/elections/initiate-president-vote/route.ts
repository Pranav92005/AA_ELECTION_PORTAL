import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // role check
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { electionId } = await req.json()
    if (!electionId) {
      return NextResponse.json(
        { error: "electionId required" },
        { status: 400 }
      )
    }

    // ❗ ONLY create approval request
    const data=await supabaseAdmin.from("approval_requests").insert({
      election_id: electionId,
      action_type: "INITIATE_PRESIDENT_VOTE",
      status: "PENDING",
      payload: {},
      requested_by: user.id,
    })
    console.log("Created approval request:", data)

    return NextResponse.json({
      status: "PENDING_OBSERVER_APPROVAL",
    })
  } catch (err) {
    console.error("INITIATE PRESIDENT VOTE ERROR:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
