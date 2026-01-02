/**
 * Shop-Owned Metaobject Setup
 * 
 * This creates metaobject definitions that are SHOP-OWNED (not app-owned).
 * Shop-owned data persists even if the app is uninstalled!
 * 
 * Key difference:
 * - App-owned: type "$app:rfq_submission" - deleted on uninstall
 * - Shop-owned: type "rfq_submission" - persists after uninstall
 */

// Type names WITHOUT $app: prefix - makes them shop-owned
export const RFQ_SUBMISSION_TYPE = "rfq_submission";
export const RFQ_SETTINGS_TYPE = "rfq_settings";

const CREATE_METAOBJECT_DEFINITION = `
  mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        id
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_METAOBJECT_DEFINITION = `
  query GetMetaobjectDefinition($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      id
      type
      name
    }
  }
`;

/**
 * Ensures the shop-owned rfq_submission metaobject type exists.
 */
export async function ensureRfqSubmissionType(admin: any): Promise<boolean> {
  try {
    // Check if the definition already exists
    const checkResponse = await admin.graphql(GET_METAOBJECT_DEFINITION, {
      variables: { type: RFQ_SUBMISSION_TYPE }
    });
    const checkData = await checkResponse.json();
    
    if (checkData?.data?.metaobjectDefinitionByType?.id) {
      console.log('RFQ: Shop-owned submission type already exists');
      return true;
    }

    // Create the shop-owned metaobject definition
    console.log('RFQ: Creating shop-owned submission type...');
    const createResponse = await admin.graphql(CREATE_METAOBJECT_DEFINITION, {
      variables: {
        definition: {
          type: RFQ_SUBMISSION_TYPE,
          name: "Quote Submission",
          access: {
            storefront: "NONE",
            admin: "MERCHANT_READ_WRITE"  // Merchant owns the data
          },
          fieldDefinitions: [
            {
              key: "customer_name",
              name: "Customer Name",
              type: "single_line_text_field",
              required: true
            },
            {
              key: "customer_email",
              name: "Customer Email",
              type: "single_line_text_field",
              required: true
            },
            {
              key: "customer_phone",
              name: "Customer Phone",
              type: "single_line_text_field",
              required: false
            },
            {
              key: "product_title",
              name: "Product",
              type: "single_line_text_field",
              required: false
            },
            {
              key: "variant_title",
              name: "Variant",
              type: "single_line_text_field",
              required: false
            },
            {
              key: "request_details",
              name: "Request Details",
              type: "multi_line_text_field",
              required: false
            },
            {
              key: "status",
              name: "Status",
              type: "single_line_text_field",
              required: true,
              validations: [
                {
                  name: "choices",
                  value: JSON.stringify(["pending", "contacted", "quoted", "completed", "cancelled"])
                }
              ]
            }
          ]
        }
      }
    });

    const createData = await createResponse.json();
    
    if (createData?.data?.metaobjectDefinitionCreate?.userErrors?.length > 0) {
      console.error('RFQ: Error creating submission definition:', createData.data.metaobjectDefinitionCreate.userErrors);
      return false;
    }

    console.log('RFQ: Shop-owned submission type created successfully!');
    return true;
  } catch (error) {
    console.error('RFQ: Error setting up submission metaobject definition:', error);
    return false;
  }
}

/**
 * Ensures the shop-owned rfq_settings metaobject type exists.
 */
export async function ensureRfqSettingsType(admin: any): Promise<boolean> {
  try {
    // Check if the definition already exists
    const checkResponse = await admin.graphql(GET_METAOBJECT_DEFINITION, {
      variables: { type: RFQ_SETTINGS_TYPE }
    });
    const checkData = await checkResponse.json();
    
    if (checkData?.data?.metaobjectDefinitionByType?.id) {
      console.log('RFQ: Shop-owned settings type already exists');
      return true;
    }

    // Create the shop-owned metaobject definition
    console.log('RFQ: Creating shop-owned settings type...');
    const createResponse = await admin.graphql(CREATE_METAOBJECT_DEFINITION, {
      variables: {
        definition: {
          type: RFQ_SETTINGS_TYPE,
          name: "RFQ Settings",
          access: {
            storefront: "PUBLIC_READ",  // Storefront needs to read settings
            admin: "MERCHANT_READ_WRITE"
          },
          fieldDefinitions: [
            {
              key: "notification_email",
              name: "Notification Email",
              type: "single_line_text_field",
              required: false
            },
            {
              key: "phone_number",
              name: "Phone Number",
              type: "single_line_text_field",
              required: false
            },
            {
              key: "form_title",
              name: "Form Title",
              type: "single_line_text_field",
              required: false
            },
            {
              key: "form_description",
              name: "Form Description",
              type: "single_line_text_field",
              required: false
            },
            {
              key: "success_message",
              name: "Success Message",
              type: "single_line_text_field",
              required: false
            }
          ]
        }
      }
    });

    const createData = await createResponse.json();
    
    if (createData?.data?.metaobjectDefinitionCreate?.userErrors?.length > 0) {
      console.error('RFQ: Error creating settings definition:', createData.data.metaobjectDefinitionCreate.userErrors);
      return false;
    }

    console.log('RFQ: Shop-owned settings type created successfully!');
    return true;
  } catch (error) {
    console.error('RFQ: Error setting up settings metaobject definition:', error);
    return false;
  }
}

/**
 * Ensures all shop-owned metaobject types exist.
 * Call this when the app loads to set up the data schema.
 */
export async function ensureAllMetaobjectTypes(admin: any): Promise<boolean> {
  console.log('RFQ: Ensuring shop-owned metaobject definitions...');
  
  const [submissionResult, settingsResult] = await Promise.all([
    ensureRfqSubmissionType(admin),
    ensureRfqSettingsType(admin)
  ]);

  if (submissionResult && settingsResult) {
    console.log('RFQ: All shop-owned metaobject types ready!');
    return true;
  }

  console.warn('RFQ: Some metaobject types failed to initialize');
  return false;
}
