import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  useIndexResourceState,
  EmptyState,
  BlockStack,
  Modal,
  Button,
  Select,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";

const GET_SUBMISSIONS_QUERY = `
  query GetRfqSubmissions($query: String) {
    metaobjects(type: "$app:rfq_submission", first: 100, query: $query, sortKey: "updated_at", reverse: true) {
      nodes {
        id
        handle
        updatedAt
        fields {
          key
          value
        }
      }
    }
  }
`;

const UPDATE_SUBMISSION_MUTATION = `
  mutation UpdateRfqSubmission($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DELETE_SUBMISSION_MUTATION = `
  mutation DeleteRfqSubmission($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

interface Submission {
  id: string;
  handle: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productTitle: string;
  variantTitle: string;
  requestDetails: string;
  status: string;
  updatedAt: string;
}

function parseSubmissionFromMetaobject(metaobject: any): Submission {
  const fields = metaobject?.fields || [];
  const getValue = (key: string) => {
    const field = fields.find((f: any) => f.key === key);
    return field?.value || "";
  };

  return {
    id: metaobject.id,
    handle: metaobject.handle,
    customerName: getValue("customer_name"),
    customerEmail: getValue("customer_email"),
    customerPhone: getValue("customer_phone"),
    productTitle: getValue("product_title"),
    variantTitle: getValue("variant_title"),
    requestDetails: getValue("request_details"),
    status: getValue("status") || "pending",
    updatedAt: metaobject.updatedAt,
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";

  // Build query filter
  let query = null;
  if (status !== "all") {
    query = `fields.status:${status}`;
  }

  const response = await admin.graphql(GET_SUBMISSIONS_QUERY, {
    variables: { query },
  });
  const data = await response.json();

  const submissions = (data?.data?.metaobjects?.nodes || []).map(parseSubmissionFromMetaobject);

  return json({ submissions, currentStatus: status });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const action = formData.get("action") as string;
  const id = formData.get("id") as string;

  if (action === "updateStatus") {
    const status = formData.get("status") as string;
    await admin.graphql(UPDATE_SUBMISSION_MUTATION, {
      variables: {
        id,
        metaobject: {
          fields: [{ key: "status", value: status }],
        },
      },
    });
  }

  if (action === "delete") {
    await admin.graphql(DELETE_SUBMISSION_MUTATION, {
      variables: { id },
    });
  }

  return json({ success: true });
};

export default function Submissions() {
  const { submissions, currentStatus } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [modalActive, setModalActive] = useState(false);

  const resourceName = {
    singular: "submission",
    plural: "submissions",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(submissions);

  const handleStatusChange = useCallback(
    (id: string, newStatus: string) => {
      submit(
        { action: "updateStatus", id, status: newStatus },
        { method: "post" }
      );
    },
    [submit]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this submission?")) {
        submit({ action: "delete", id }, { method: "post" });
      }
    },
    [submit]
  );

  const openModal = (submission: Submission) => {
    setSelectedSubmission(submission);
    setModalActive(true);
  };

  const closeModal = () => {
    setSelectedSubmission(null);
    setModalActive(false);
  };

  const statusOptions = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Contacted", value: "contacted" },
    { label: "Quoted", value: "quoted" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge tone="attention">Pending</Badge>;
      case "contacted":
        return <Badge tone="info">Contacted</Badge>;
      case "quoted":
        return <Badge tone="warning">Quoted</Badge>;
      case "completed":
        return <Badge tone="success">Completed</Badge>;
      case "cancelled":
        return <Badge>Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  const rowMarkup = submissions.map((submission: Submission, index: number) => (
    <IndexTable.Row
      id={submission.id}
      key={submission.id}
      selected={selectedResources.includes(submission.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {submission.customerName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{submission.customerEmail}</IndexTable.Cell>
      <IndexTable.Cell>{submission.customerPhone || "-"}</IndexTable.Cell>
      <IndexTable.Cell>{submission.productTitle || "General Inquiry"}</IndexTable.Cell>
      <IndexTable.Cell>{getStatusBadge(submission.status)}</IndexTable.Cell>
      <IndexTable.Cell>{formatDate(submission.updatedAt)}</IndexTable.Cell>
      <IndexTable.Cell>
        <Button size="slim" onClick={() => openModal(submission)}>
          View
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const emptyStateMarkup = (
    <EmptyState
      heading="No quote submissions yet"
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Quote submissions from customers will appear here.</p>
    </EmptyState>
  );

  return (
    <Page
      title="Quote Submissions"
      backAction={{ content: "Home", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <div style={{ padding: "16px" }}>
              <Select
                label="Filter by status"
                options={statusOptions}
                value={currentStatus}
                onChange={(value) => {
                  window.location.href = `/app/submissions?status=${value}`;
                }}
              />
            </div>
            {submissions.length === 0 ? (
              emptyStateMarkup
            ) : (
              <IndexTable
                resourceName={resourceName}
                itemCount={submissions.length}
                selectedItemsCount={
                  allResourcesSelected ? "All" : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: "Name" },
                  { title: "Email" },
                  { title: "Phone" },
                  { title: "Product" },
                  { title: "Status" },
                  { title: "Date" },
                  { title: "Actions" },
                ]}
              >
                {rowMarkup}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      {selectedSubmission && (
        <Modal
          open={modalActive}
          onClose={closeModal}
          title="Quote Submission Details"
          primaryAction={{
            content: "Close",
            onAction: closeModal,
          }}
          secondaryActions={[
            {
              content: "Delete",
              destructive: true,
              onAction: () => {
                handleDelete(selectedSubmission.id);
                closeModal();
              },
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <div>
                <Text as="h3" variant="headingSm">
                  Customer Information
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Name:</strong> {selectedSubmission.customerName}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Email:</strong> {selectedSubmission.customerEmail}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Phone:</strong>{" "}
                  {selectedSubmission.customerPhone || "Not provided"}
                </Text>
              </div>

              <div>
                <Text as="h3" variant="headingSm">
                  Product
                </Text>
                <Text as="p" variant="bodyMd">
                  {selectedSubmission.productTitle || "General Inquiry"}
                  {selectedSubmission.variantTitle &&
                    ` - ${selectedSubmission.variantTitle}`}
                </Text>
              </div>

              <div>
                <Text as="h3" variant="headingSm">
                  Request Details
                </Text>
                <Text as="p" variant="bodyMd">
                  {selectedSubmission.requestDetails}
                </Text>
              </div>

              <div>
                <Text as="h3" variant="headingSm">
                  Status
                </Text>
                <Select
                  label=""
                  labelHidden
                  options={[
                    { label: "Pending", value: "pending" },
                    { label: "Contacted", value: "contacted" },
                    { label: "Quoted", value: "quoted" },
                    { label: "Completed", value: "completed" },
                    { label: "Cancelled", value: "cancelled" },
                  ]}
                  value={selectedSubmission.status}
                  onChange={(value) => {
                    handleStatusChange(selectedSubmission.id, value);
                    setSelectedSubmission({
                      ...selectedSubmission,
                      status: value,
                    });
                  }}
                />
              </div>

              <div>
                <Text as="h3" variant="headingSm">
                  Submitted
                </Text>
                <Text as="p" variant="bodyMd">
                  {formatDate(selectedSubmission.updatedAt)}
                </Text>
              </div>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
