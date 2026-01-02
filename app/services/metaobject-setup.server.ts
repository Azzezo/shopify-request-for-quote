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

// The type name WITHOUT $app: prefix - makes it shop-owned
export const RFQ_SUBMISSION_TYPE = "rfq_submission";

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
 * This should be called when the app loads or during setup.
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
              required: false  // Optional - some merchants may not need it
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
      console.error('RFQ: Error creating definition:', createData.data.metaobjectDefinitionCreate.userErrors);
      return false;
    }

    console.log('RFQ: Shop-owned submission type created successfully!');
    return true;
  } catch (error) {
    console.error('RFQ: Error setting up metaobject definition:', error);
    return false;
  }
}

