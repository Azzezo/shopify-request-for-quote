import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { sendQuoteNotification } from "../services/email.server";
import { 
  RFQ_SUBMISSION_TYPE, 
  RFQ_SETTINGS_TYPE,
  ensureRfqSubmissionType,
  ensureRfqSettingsType 
} from "../services/metaobject-setup.server";

// CORS headers - App Proxy requests come from Shopify's domain
// The proxy itself validates the shop has the app installed
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// Simple in-memory rate limiter (per email, 50 submissions per hour)
// In production with multiple instances, consider using Redis
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(email);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(email, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Clean up old entries periodically (every 100 requests)
let cleanupCounter = 0;
function cleanupRateLimitMap() {
  cleanupCounter++;
  if (cleanupCounter % 100 === 0) {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }
}

const GET_SETTINGS_QUERY = `
  query GetRfqSettings($type: String!) {
    metaobjects(type: $type, first: 1) {
      nodes {
        id
        fields {
          key
          value
        }
      }
    }
  }
`;

const CREATE_SUBMISSION_MUTATION = `
  mutation CreateRfqSubmission($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Handle GET requests - return app settings for the storefront
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Shop parameter required" }, { status: 400, headers: corsHeaders });
  }

  try {
    const { admin } = await unauthenticated.admin(shop);
    
    // Ensure the shop-owned settings definition exists
    await ensureRfqSettingsType(admin);
    
    const response = await admin.graphql(GET_SETTINGS_QUERY, {
      variables: { type: RFQ_SETTINGS_TYPE }
    });
    const data = await response.json();
    
    const settings = data?.data?.metaobjects?.nodes?.[0];
    const fields = settings?.fields || [];
    const getValue = (key: string, defaultValue: string) => {
      const field = fields.find((f: any) => f.key === key);
      return field?.value || defaultValue;
    };

    return json({
      phoneNumber: getValue("phone_number", "+353 (0)1 8118920"),
      formTitle: getValue("form_title", "Request a Quote"),
      formDescription: getValue("form_description", "Or feel free to call us"),
      successMessage: getValue("success_message", "Thank you! We will get back to you shortly."),
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return json({
      phoneNumber: "+353 (0)1 8118920",
      formTitle: "Request a Quote",
      formDescription: "Or feel free to call us",
      successMessage: "Thank you! We will get back to you shortly.",
    }, { headers: corsHeaders });
  }
};

// Handle POST requests - submit a quote request
export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await request.formData();
    
    const shop = formData.get("shop") as string;
    const productTitle = formData.get("productTitle") as string;
    const variantTitle = formData.get("variantTitle") as string;
    const customerName = formData.get("customerName") as string;
    const customerEmail = formData.get("customerEmail") as string;
    const customerPhone = formData.get("customerPhone") as string;
    const customerCompany = formData.get("customerCompany") as string;
    const quantity = formData.get("quantity") as string;
    const requestDetails = formData.get("requestDetails") as string;
    
    console.log("RFQ Submission received:", { shop, customerName, customerEmail, productTitle });

    // Validate required fields (requestDetails is optional)
    if (!shop || !customerName || !customerEmail) {
      return json(
        { error: "Missing required fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return json(
        { error: "Invalid email format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Rate limiting to prevent spam (50 submissions per email per hour)
    cleanupRateLimitMap();
    if (!checkRateLimit(customerEmail.toLowerCase())) {
      console.warn("RFQ: Rate limit exceeded for", customerEmail);
      return json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: corsHeaders }
      );
    }

    const { admin } = await unauthenticated.admin(shop);

    // Ensure the shop-owned metaobject definition exists before creating entries
    // This is idempotent - it only creates if not already present
    await ensureRfqSubmissionType(admin);

    // Generate a unique handle for the submission
    const handle = `rfq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create the submission metaobject (shop-owned - persists after uninstall)
    const createResponse = await admin.graphql(CREATE_SUBMISSION_MUTATION, {
      variables: {
        metaobject: {
          type: RFQ_SUBMISSION_TYPE,
          handle,
          fields: [
            { key: "customer_name", value: customerName },
            { key: "customer_email", value: customerEmail },
            { key: "customer_phone", value: customerPhone || "" },
            { key: "product_title", value: productTitle || "" },
            { key: "variant_title", value: variantTitle || "" },
            { key: "request_details", value: requestDetails || "" },
            { key: "status", value: "pending" },
          ],
        },
      },
    });

    const createData = await createResponse.json();
    
    if (createData?.data?.metaobjectCreate?.userErrors?.length > 0) {
      console.error("Error creating submission:", createData.data.metaobjectCreate.userErrors);
      return json(
        { error: "Failed to save submission" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get settings for notification email
    const settingsResponse = await admin.graphql(GET_SETTINGS_QUERY, {
      variables: { type: RFQ_SETTINGS_TYPE }
    });
    const settingsData = await settingsResponse.json();
    const settings = settingsData?.data?.metaobjects?.nodes?.[0];
    const fields = settings?.fields || [];
    const notificationEmail = fields.find((f: any) => f.key === "notification_email")?.value;
    const successMessage = fields.find((f: any) => f.key === "success_message")?.value || 
      "Thank you! We will get back to you shortly.";

    // Send email notification if configured
    if (notificationEmail) {
      await sendQuoteNotification({
        to: notificationEmail,
        submission: {
          id: createData.data.metaobjectCreate.metaobject.id,
          shop,
          productTitle,
          variantTitle,
          customerName,
          customerEmail,
          customerPhone,
          requestDetails,
          createdAt: new Date(),
        },
      });
    }

    return json(
      { success: true, message: successMessage },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error processing quote submission:", error);
    return json(
      { error: "Failed to process submission" },
      { status: 500, headers: corsHeaders }
    );
  }
};
