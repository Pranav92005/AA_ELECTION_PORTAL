// app/api/nomination/supporter/approve/route.ts
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(req: Request) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ error: "Token missing" }, { status: 400 })
  }

  const { data: supporter, error } = await supabaseAdmin
    .from("nomination_supporter_tokens")
    .select("*")
    .eq("token", token)
    .single()

  if (error || !supporter) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 })
  }

  if (supporter.approved_at) {
    return NextResponse.json({ error: "Already approved" }, { status: 409 })
  }

  if (new Date(supporter.expires_at) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 410 })
  }

  // Mark supporter approval
  await supabaseAdmin
    .from("nomination_supporter_tokens")
    .update({ approved_at: new Date().toISOString() ,approve: true})
    .eq("id", supporter.id)

  // Check if both proposer & seconder approved
  const { data: approvals } = await supabaseAdmin
    .from("nomination_supporter_tokens")
    .select("approved_at")
    .eq("nomination_id", supporter.nomination_id)

  const allApproved =
    approvals?.length === 2 &&
    approvals.every((a) => a.approved_at !== null)

  if (allApproved) {
    await supabaseAdmin
      .from("nominations")
      .update({ status: "PENDING_ADMIN_REVIEW" })
      .eq("id", supporter.nomination_id)
  }

  return NextResponse.json({ status: "APPROVED" })
}
