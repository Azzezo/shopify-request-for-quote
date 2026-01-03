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
        code
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
 * Throws an error if creation fails.
 */
export async function ensureRfqSubmissionType(admin: any): Promise<boolean> {
  try {
    // Check if the definition already exists
    console.log('RFQ: Checking if submission type exists...');
    const checkResponse = await admin.graphql(GET_METAOBJECT_DEFINITION, {
      variables: { type: RFQ_SUBMISSION_TYPE }
    });
    const checkData = await checkResponse.json();
    
    console.log('RFQ: Check response:', JSON.stringify(checkData, null, 2));
    
    if (checkData?.data?.metaobjectDefinitionByType?.id) {
      console.log('RFQ: Shop-owned submission type already exists');
      return true;
    }

    // Create the merchant-owned metaobject definition
    // Note: For merchant-owned metaobjects, we only set storefront access
    // admin access is automatically full read/write for merchants and all apps
    console.log('RFQ: Creating merchant-owned submission type...');
    const createResponse = await admin.graphql(CREATE_METAOBJECT_DEFINITION, {
      variables: {
        definition: {
          type: RFQ_SUBMISSION_TYPE,
          name: "Quote Submission",
          access: {
            storefront: "NONE"
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
    console.log('RFQ: Create submission definition response:', JSON.stringify(createData, null, 2));
    
    if (createData?.data?.metaobjectDefinitionCreate?.userErrors?.length > 0) {
      const errors = createData.data.metaobjectDefinitionCreate.userErrors;
      console.error('RFQ: Error creating submission definition:', errors);
      throw new Error(`Failed to create submission definition: ${JSON.stringify(errors)}`);
    }

    if (createData?.errors) {
      console.error('RFQ: GraphQL errors:', createData.errors);
      throw new Error(`GraphQL error creating submission definition: ${JSON.stringify(createData.errors)}`);
    }

    console.log('RFQ: Shop-owned submission type created successfully!');
    return true;
  } catch (error) {
    console.error('RFQ: Error setting up submission metaobject definition:', error);
    throw error;
  }
}

/**
 * Ensures the shop-owned rfq_settings metaobject type exists.
 * Throws an error if creation fails.
 */
export async function ensureRfqSettingsType(admin: any): Promise<boolean> {
  try {
    // Check if the definition already exists
    console.log('RFQ: Checking if settings type exists...');
    const checkResponse = await admin.graphql(GET_METAOBJECT_DEFINITION, {
      variables: { type: RFQ_SETTINGS_TYPE }
    });
    const checkData = await checkResponse.json();
    
    console.log('RFQ: Check settings response:', JSON.stringify(checkData, null, 2));
    
    if (checkData?.data?.metaobjectDefinitionByType?.id) {
      console.log('RFQ: Shop-owned settings type already exists');
      return true;
    }

    // Create the merchant-owned metaobject definition
    // Note: For merchant-owned metaobjects, we only set storefront access
    // admin access is automatically full read/write for merchants and all apps
    console.log('RFQ: Creating merchant-owned settings type...');
    const createResponse = await admin.graphql(CREATE_METAOBJECT_DEFINITION, {
      variables: {
        definition: {
          type: RFQ_SETTINGS_TYPE,
          name: "RFQ Settings",
          access: {
            storefront: "PUBLIC_READ"
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
    console.log('RFQ: Create settings definition response:', JSON.stringify(createData, null, 2));
    
    if (createData?.data?.metaobjectDefinitionCreate?.userErrors?.length > 0) {
      const errors = createData.data.metaobjectDefinitionCreate.userErrors;
      console.error('RFQ: Error creating settings definition:', errors);
      throw new Error(`Failed to create settings definition: ${JSON.stringify(errors)}`);
    }

    if (createData?.errors) {
      console.error('RFQ: GraphQL errors:', createData.errors);
      throw new Error(`GraphQL error creating settings definition: ${JSON.stringify(createData.errors)}`);
    }

    console.log('RFQ: Shop-owned settings type created successfully!');
    return true;
  } catch (error) {
    console.error('RFQ: Error setting up settings metaobject definition:', error);
    throw error;
  }
}

/**
 * Ensures all shop-owned metaobject types exist.
 * Call this when the app loads to set up the data schema.
 */
export async function ensureAllMetaobjectTypes(admin: any): Promise<boolean> {
  console.log('RFQ: Ensuring shop-owned metaobject definitions...');
  
  // Run sequentially to avoid race conditions
  await ensureRfqSettingsType(admin);
  await ensureRfqSubmissionType(admin);

  console.log('RFQ: All shop-owned metaobject types ready!');
  return true;
}

// ============================================
// METAFIELD DEFINITIONS
// ============================================
// These allow the admin block extension to write metafields
// that are readable by the storefront theme extension

const GET_METAFIELD_DEFINITION = `
  query GetMetafieldDefinition($namespace: String!, $key: String!, $ownerType: MetafieldOwnerType!) {
    metafieldDefinitions(first: 1, namespace: $namespace, key: $key, ownerType: $ownerType) {
      nodes {
        id
        namespace
        key
      }
    }
  }
`;

const CREATE_METAFIELD_DEFINITION = `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

/**
 * Ensures a product metafield definition exists with storefront read access.
 */
async function ensureProductMetafieldDefinition(
  admin: any, 
  namespace: string, 
  key: string, 
  name: string, 
  description: string
): Promise<boolean> {
  try {
    // Check if definition exists
    const checkResponse = await admin.graphql(GET_METAFIELD_DEFINITION, {
      variables: { namespace, key, ownerType: "PRODUCT" }
    });
    const checkData = await checkResponse.json();
    
    if (checkData?.data?.metafieldDefinitions?.nodes?.length > 0) {
      console.log(`RFQ: Metafield definition ${namespace}.${key} already exists`);
      return true;
    }

    // Create definition with storefront access
    console.log(`RFQ: Creating metafield definition ${namespace}.${key}...`);
    const createResponse = await admin.graphql(CREATE_METAFIELD_DEFINITION, {
      variables: {
        definition: {
          namespace,
          key,
          name,
          description,
          type: "boolean",
          ownerType: "PRODUCT",
          access: {
            admin: "MERCHANT_READ_WRITE",
            storefront: "PUBLIC_READ"
          }
        }
      }
    });

    const createData = await createResponse.json();
    
    if (createData?.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
      const errors = createData.data.metafieldDefinitionCreate.userErrors;
      // Ignore "already exists" errors
      if (!errors.some((e: any) => e.code === "TAKEN")) {
        console.error(`RFQ: Error creating metafield definition ${namespace}.${key}:`, errors);
        return false;
      }
    }

    console.log(`RFQ: Metafield definition ${namespace}.${key} created successfully`);
    return true;
  } catch (error) {
    console.error(`RFQ: Error ensuring metafield definition ${namespace}.${key}:`, error);
    return false;
  }
}

/**
 * Ensures all product metafield definitions exist for RFQ functionality.
 * This allows the admin block to set metafields that the storefront can read.
 */
export async function ensureProductMetafieldDefinitions(admin: any): Promise<boolean> {
  console.log('RFQ: Ensuring product metafield definitions...');
  
  const results = await Promise.all([
    ensureProductMetafieldDefinition(
      admin,
      "custom",
      "rfq_enabled",
      "Enable Request for Quote",
      "When enabled, the Add to Cart button will be replaced with a Request for Quote button"
    ),
    ensureProductMetafieldDefinition(
      admin,
      "custom",
      "rfq_hide_price",
      "Hide Price",
      "When enabled, the product price will be hidden when RFQ is active"
    )
  ]);

  const allSuccess = results.every(r => r);
  if (allSuccess) {
    console.log('RFQ: All product metafield definitions ready!');
  } else {
    console.warn('RFQ: Some metafield definitions failed to create');
  }
  
  return allSuccess;
}
