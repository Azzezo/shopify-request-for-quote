import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  BlockStack,
  Text,
  Banner,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";

// GraphQL queries for metaobjects
const GET_SETTINGS_QUERY = `
  query GetRfqSettings {
    metaobjects(type: "$app:rfq_settings", first: 1) {
      nodes {
        id
        handle
        fields {
          key
          value
        }
      }
    }
  }
`;

const CREATE_SETTINGS_MUTATION = `
  mutation CreateRfqSettings($metaobject: MetaobjectCreateInput!) {
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

const UPDATE_SETTINGS_MUTATION = `
  mutation UpdateRfqSettings($id: ID!, $metaobject: MetaobjectUpdateInput!) {
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

interface Settings {
  id?: string;
  notificationEmail: string;
  phoneNumber: string;
  formTitle: string;
  formDescription: string;
  successMessage: string;
}

function parseSettingsFromMetaobject(metaobject: any): Settings {
  const fields = metaobject?.fields || [];
  const getValue = (key: string, defaultValue: string) => {
    const field = fields.find((f: any) => f.key === key);
    return field?.value || defaultValue;
  };

  return {
    id: metaobject?.id,
    notificationEmail: getValue("notification_email", ""),
    phoneNumber: getValue("phone_number", "+353 (0)1 8118920"),
    formTitle: getValue("form_title", "Request a Quote"),
    formDescription: getValue("form_description", "Or feel free to call us"),
    successMessage: getValue("success_message", "Thank you! We will get back to you shortly."),
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(GET_SETTINGS_QUERY);
  const data = await response.json();
  
  const metaobject = data?.data?.metaobjects?.nodes?.[0];
  const settings = parseSettingsFromMetaobject(metaobject);

  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const settingsId = formData.get("settingsId") as string;
  const notificationEmail = formData.get("notificationEmail") as string;
  const phoneNumber = formData.get("phoneNumber") as string;
  const formTitle = formData.get("formTitle") as string;
  const formDescription = formData.get("formDescription") as string;
  const successMessage = formData.get("successMessage") as string;

  const fields = [
    { key: "notification_email", value: notificationEmail },
    { key: "phone_number", value: phoneNumber },
    { key: "form_title", value: formTitle },
    { key: "form_description", value: formDescription },
    { key: "success_message", value: successMessage },
  ];

  if (settingsId) {
    // Update existing settings
    await admin.graphql(UPDATE_SETTINGS_MUTATION, {
      variables: {
        id: settingsId,
        metaobject: { fields },
      },
    });
  } else {
    // Create new settings
    await admin.graphql(CREATE_SETTINGS_MUTATION, {
      variables: {
        metaobject: {
          type: "$app:rfq_settings",
          handle: "default-settings",
          fields,
        },
      },
    });
  }

  return json({ success: true });
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showSuccess, setShowSuccess] = useState(false);

  const [formState, setFormState] = useState({
    notificationEmail: settings.notificationEmail,
    phoneNumber: settings.phoneNumber,
    formTitle: settings.formTitle,
    formDescription: settings.formDescription,
    successMessage: settings.successMessage,
  });

  useEffect(() => {
    if (navigation.state === "idle" && navigation.formData) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [navigation.state, navigation.formData]);

  const handleChange = useCallback(
    (field: string) => (value: string) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSubmit = () => {
    submit(
      { ...formState, settingsId: settings.id || "" },
      { method: "post" }
    );
  };

  return (
    <Page
      title="Settings"
      backAction={{ content: "Home", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {showSuccess && (
              <Banner title="Settings saved successfully!" tone="success" onDismiss={() => setShowSuccess(false)} />
            )}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Notification Settings
                </Text>
                <FormLayout>
                  <TextField
                    label="Notification Email"
                    type="email"
                    value={formState.notificationEmail}
                    onChange={handleChange("notificationEmail")}
                    helpText="Quote requests will be sent to this email address"
                    autoComplete="email"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Form Customization
                </Text>
                <FormLayout>
                  <TextField
                    label="Phone Number"
                    value={formState.phoneNumber}
                    onChange={handleChange("phoneNumber")}
                    helpText="Displayed in the quote request modal"
                    autoComplete="tel"
                  />
                  <TextField
                    label="Form Title"
                    value={formState.formTitle}
                    onChange={handleChange("formTitle")}
                    helpText="Main heading of the quote request modal"
                    autoComplete="off"
                  />
                  <TextField
                    label="Form Description"
                    value={formState.formDescription}
                    onChange={handleChange("formDescription")}
                    helpText="Subtitle text shown below the title"
                    autoComplete="off"
                  />
                  <TextField
                    label="Success Message"
                    value={formState.successMessage}
                    onChange={handleChange("successMessage")}
                    helpText="Message shown after successful submission"
                    autoComplete="off"
                    multiline={2}
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={isSubmitting}
              >
                Save Settings
              </Button>
            </div>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  About Settings
                </Text>
                <Text as="p" variant="bodyMd">
                  Configure your Request for Quote app settings here. The notification
                  email is where you'll receive all quote requests from customers.
                </Text>
                <Text as="p" variant="bodyMd">
                  You can customize the form text that customers see when requesting
                  a quote, including the phone number displayed.
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  💡 No External Database
                </Text>
                <Text as="p" variant="bodyMd">
                  This app stores all data directly in Shopify using Metaobjects.
                  No external database setup required!
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
