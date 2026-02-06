// import { Resend } from "resend"

// const resend = new Resend(process.env.RESEND_API_KEY!)

// export async function sendMail({
//   to,
//   subject,
//   html,
// }: {
//   to: string
//   subject: string
//   html: string
// }) {
//   const { error } = await resend.emails.send({
//     from: "IIT BBS Alumni Elections <no-reply@resend.dev>",
//     to,
//     subject,
//     html,
//   })

//   if (error) {
//     throw new Error(error.message)
//   }
// }




// lib/mailer.ts
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY!)

const IS_DEV = process.env.NODE_ENV !== "production"
const DEV_EMAIL = process.env.DEV_EMAIL!

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const finalRecipient = IS_DEV ? DEV_EMAIL : to

  const { error } = await resend.emails.send({
    from: "IIT BBS Elections <no-reply@resend.dev>",
    to: finalRecipient,
    subject,
    html: IS_DEV
      ? `
        <div style="border:1px solid #ccc; padding:12px">
          <p><strong>[DEV MODE]</strong></p>
          <p><strong>Original recipient:</strong> ${to}</p>
          <hr />
          ${html}
        </div>
      `
      : html,
  })

  if (error) {
    throw new Error(error.message)
  }
}
