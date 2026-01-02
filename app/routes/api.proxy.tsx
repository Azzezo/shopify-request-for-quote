import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { sendQuoteNotification } from "../services/email.server";
import { RFQ_SUBMISSION_TYPE } from "../services/metaobject-setup.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const GET_SETTINGS_QUERY = `
  query GetRfqSettings {
    metaobjects(type: "$app:rfq_settings", first: 1) {
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
    
    const response = await admin.graphql(GET_SETTINGS_QUERY);
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

    const { admin } = await unauthenticated.admin(shop);

    // Generate a unique handle for the submission
    const handle = `rfq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create the submission metaobject (SHOP-OWNED - persists after uninstall!)
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
            { key: "request_details", value: requestDetails },
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
    const settingsResponse = await admin.graphql(GET_SETTINGS_QUERY);
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
