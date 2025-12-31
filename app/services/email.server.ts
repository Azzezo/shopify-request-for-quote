import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface QuoteSubmission {
  id: string;
  shop: string;
  productTitle?: string | null;
  variantTitle?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  requestDetails: string;
  createdAt: Date;
}

interface SendQuoteNotificationParams {
  to: string;
  submission: QuoteSubmission;
}

export async function sendQuoteNotification({
  to,
  submission,
}: SendQuoteNotificationParams): Promise<boolean> {
  try {
    const productInfo = submission.productTitle
      ? `<p><strong>Product:</strong> ${submission.productTitle}${
          submission.variantTitle ? ` - ${submission.variantTitle}` : ""
        }</p>`
      : "<p><strong>Product:</strong> General Inquiry</p>";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9f9f9; }
            .field { margin-bottom: 15px; }
            .field strong { color: #2c3e50; }
            .details { background: white; padding: 15px; border-left: 4px solid #3498db; margin-top: 15px; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f1f1f1; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📋 New Quote Request</h1>
            </div>
            <div class="content">
              <div class="field">
                <strong>👤 Customer Name:</strong> ${submission.customerName}
              </div>
              <div class="field">
                <strong>📧 Email:</strong> <a href="mailto:${submission.customerEmail}">${submission.customerEmail}</a>
              </div>
              <div class="field">
                <strong>📞 Phone:</strong> ${submission.customerPhone || "Not provided"}
              </div>
              ${productInfo}
              <div class="details">
                <strong>📝 Request Details:</strong>
                <p style="margin: 10px 0 0 0;">${submission.requestDetails.replace(/\n/g, "<br>")}</p>
              </div>
            </div>
            <div class="footer">
              <p>This quote request was submitted through your Shopify store.</p>
              <p><strong>View all submissions:</strong> Apps → Request for Quote → Quote Submissions</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
📋 NEW QUOTE REQUEST
====================

👤 Customer Name: ${submission.customerName}
📧 Email: ${submission.customerEmail}
📞 Phone: ${submission.customerPhone || "Not provided"}
🛍️ Product: ${submission.productTitle || "General Inquiry"}${
      submission.variantTitle ? ` - ${submission.variantTitle}` : ""
    }

📝 Request Details:
${submission.requestDetails}

---
This quote request was submitted through your Shopify store.
View all submissions in your Shopify admin: Apps → Request for Quote → Quote Submissions
    `;

    // If no RESEND_API_KEY is configured, log the email instead
    if (!process.env.RESEND_API_KEY) {
      console.log("=== QUOTE NOTIFICATION EMAIL ===");
      console.log("To:", to);
      console.log("Subject: New Quote Request from", submission.customerName);
      console.log(textContent);
      console.log("================================");
      return true;
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Request for Quote <noreply@resend.dev>",
      to: [to],
      subject: `📋 New Quote Request from ${submission.customerName}`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error("Failed to send email:", error);
      return false;
    }

    console.log("Email sent successfully:", data?.id);
    return true;
  } catch (error) {
    console.error("Error sending notification email:", error);
    return false;
  }
}
