import { useEffect, useState } from "react";
import {
  reactExtension,
  useApi,
  AdminBlock,
  BlockStack,
  Text,
  Checkbox,
  Banner,
} from "@shopify/ui-extensions-react/admin";

// The target for this extension - appears on product details page
const TARGET = "admin.product-details.block.render";

export default reactExtension(TARGET, () => <RfqProductBlock />);

function RfqProductBlock() {
  const { data, query } = useApi(TARGET);
  
  const [rfqEnabled, setRfqEnabled] = useState(false);
  const [hidePrice, setHidePrice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Get the product ID from the extension data
  const productId = data?.selected?.[0]?.id;

  // Fetch current metafield values on load
  useEffect(() => {
    async function fetchMetafields() {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        const result = await query(
          `query GetProductMetafields($id: ID!) {
            product(id: $id) {
              rfqEnabled: metafield(namespace: "app", key: "rfq_enabled") {
                id
                value
              }
              rfqHidePrice: metafield(namespace: "app", key: "rfq_hide_price") {
                id
                value
              }
            }
          }`,
          { variables: { id: productId } }
        );

        if (result?.data?.product) {
          const enabledValue = result.data.product.rfqEnabled?.value;
          const hidePriceValue = result.data.product.rfqHidePrice?.value;
          
          setRfqEnabled(enabledValue === "true");
          setHidePrice(hidePriceValue === "true");
        }
      } catch (err) {
        console.error("Error fetching metafields:", err);
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    fetchMetafields();
  }, [productId, query]);

  // Update metafield via GraphQL mutation
  async function updateMetafield(namespace, key, value) {
    const mutation = `
      mutation UpdateProductMetafield($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const result = await query(mutation, {
      variables: {
        input: {
          id: productId,
          metafields: [
            {
              namespace,
              key,
              value: String(value),
              type: "boolean",
            },
          ],
        },
      },
    });

    if (result?.data?.productUpdate?.userErrors?.length > 0) {
      throw new Error(result.data.productUpdate.userErrors[0].message);
    }

    return result;
  }

  // Handle RFQ toggle
  const handleRfqToggle = async (checked) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateMetafield("app", "rfq_enabled", checked);
      setRfqEnabled(checked);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error("Error updating RFQ enabled:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Hide Price toggle
  const handleHidePriceToggle = async (checked) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateMetafield("app", "rfq_hide_price", checked);
      setHidePrice(checked);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error("Error updating hide price:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminBlock title="Request for Quote">
        <Text>Loading...</Text>
      </AdminBlock>
    );
  }

  return (
    <AdminBlock title="Request for Quote">
      <BlockStack gap="base">
        {error && (
          <Banner tone="critical" dismissible onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}
        
        {success && (
          <Banner tone="success" dismissible onDismiss={() => setSuccess(false)}>
            Settings saved!
          </Banner>
        )}

        <Checkbox
          label="Enable Request for Quote"
          checked={rfqEnabled}
          disabled={saving}
          onChange={handleRfqToggle}
        />
        
        <Text color="subdued">
          {rfqEnabled 
            ? "Customers will see a 'Request a Quote' button instead of Add to Cart"
            : "Standard Add to Cart button will be shown"
          }
        </Text>

        {rfqEnabled && (
          <BlockStack gap="small">
            <Checkbox
              label="Hide product price"
              checked={hidePrice}
              disabled={saving}
              onChange={handleHidePriceToggle}
            />
            <Text color="subdued">
              {hidePrice 
                ? "Price will be hidden on the storefront"
                : "Price will be visible to customers"
              }
            </Text>
          </BlockStack>
        )}
      </BlockStack>
    </AdminBlock>
  );
}
