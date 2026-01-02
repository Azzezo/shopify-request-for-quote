import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  List,
  Link,
  Banner,
  InlineStack,
  Badge,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { ensureRfqSubmissionType, RFQ_SUBMISSION_TYPE } from "../services/metaobject-setup.server";

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

// NOTE: MetaobjectConnection does NOT expose totalCount in the Admin API schema.
// To compute counts, we page through nodes and count them server-side.
const COUNT_METAOBJECTS_QUERY = `
  query CountMetaobjects($type: String!, $first: Int!, $after: String, $query: String) {
    metaobjects(type: $type, first: $first, after: $after, query: $query) {
      nodes { id }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Ensure the shop-owned metaobject type exists (runs once, then cached)
  await ensureRfqSubmissionType(admin);

  // Get app settings
  const settingsResponse = await admin.graphql(GET_SETTINGS_QUERY);
  const settingsData = await settingsResponse.json();
  const settings = settingsData?.data?.metaobjects?.nodes?.[0];
  const notificationEmail = settings?.fields?.find((f: any) => f.key === "notification_email")?.value;

  const countMetaobjects = async (type: string, query?: string) => {
    let after: string | null = null;
    let total = 0;
    const first = 250;
    // Safety cap to avoid runaway loops in case of unexpected pagination behavior.
    const maxPages = 50;

    for (let page = 0; page < maxPages; page++) {
      const resp = await admin.graphql(COUNT_METAOBJECTS_QUERY, {
        variables: {
          type,
          first,
          after,
          query: query ?? null,
        },
      });
      const data = await resp.json();
      const conn = data?.data?.metaobjects;
      const nodes = conn?.nodes ?? [];
      total += nodes.length;

      if (!conn?.pageInfo?.hasNextPage) break;
      after = conn.pageInfo.endCursor;
      if (!after) break;
    }

    return total;
  };

  // Get submission counts (computed via pagination) - uses SHOP-OWNED type
  const submissionsCount = await countMetaobjects(RFQ_SUBMISSION_TYPE);
  const pendingCount = await countMetaobjects(
    RFQ_SUBMISSION_TYPE,
    "fields.status:pending"
  );

  return json({
    shop,
    hasSettings: !!notificationEmail,
    submissionsCount,
    pendingCount,
  });
};

export default function Index() {
  const { hasSettings, submissionsCount, pendingCount } = useLoaderData<typeof loader>();

  return (
    <Page title="Request for Quote">
      <BlockStack gap="500">
        {!hasSettings && (
          <Banner
            title="Setup Required"
            tone="warning"
            action={{ content: "Go to Settings", url: "/app/settings" }}
          >
            <p>
              Please configure your notification email in Settings to receive quote requests.
            </p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Welcome to Request for Quote
                </Text>
                <Text as="p" variant="bodyMd">
                  This app allows customers to request quotes for your products instead of adding them to cart.
                </Text>
                
                <Box paddingBlockStart="200">
                  <Text as="h3" variant="headingSm">
                    How it works:
                  </Text>
                  <List type="number">
                    <List.Item>
                      Enable "Request for Quote" on individual products via their metafields
                    </List.Item>
                    <List.Item>
                      The theme extension will replace the Add to Cart button with a Request Quote button
                    </List.Item>
                    <List.Item>
                      Customers fill out a form with their details and request
                    </List.Item>
                    <List.Item>
                      You receive an email notification and can view all submissions here
                    </List.Item>
                  </List>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Quick Stats
                  </Text>
                  <InlineStack gap="200" align="space-between">
                    <Text as="p" variant="bodyMd">Total Submissions</Text>
                    <Badge>{submissionsCount.toString()}</Badge>
                  </InlineStack>
                  <InlineStack gap="200" align="space-between">
                    <Text as="p" variant="bodyMd">Pending</Text>
                    <Badge tone="attention">{pendingCount.toString()}</Badge>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Quick Links
                  </Text>
                  <List>
                    <List.Item>
                      <Link url="/app/settings">App Settings</Link>
                    </List.Item>
                    <List.Item>
                      <Link url="/app/submissions">View All Submissions</Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Enable on Products
                  </Text>
                  <Text as="p" variant="bodyMd">
                    To enable Request for Quote on a product:
                  </Text>
                  <List>
                    <List.Item>Go to the product in Shopify Admin</List.Item>
                    <List.Item>Scroll to Metafields section</List.Item>
                    <List.Item>Set "Enable Request for Quote" to true</List.Item>
                    <List.Item>Optionally, enable "Hide Price"</List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    💡 No External Database
                  </Text>
                  <Text as="p" variant="bodyMd">
                    This app stores all data directly in Shopify using Metaobjects - no external database needed!
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
