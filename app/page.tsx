import ClientPage from "./_page-client";

interface ValidationResult {
  is_valid: boolean;
  message?: string;
  allowed_origins?: string[];
}

async function validateApiKey(apiKey: string): Promise<ValidationResult> {
  const BARIKOI_VALIDATE_URL = "https://api.map.barikoi.com/api/validation";

  try {
    const response = await fetch(
      `${BARIKOI_VALIDATE_URL}?api_key=${encodeURIComponent(apiKey)}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return { is_valid: false, message: "Validation service unavailable" };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API key validation error:", error);
    return { is_valid: false, message: "Network error during validation" };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ "api-key"?: string }>;
}) {
  const params = await searchParams;
  const apiKey = params["api-key"];

  // Check for API key
  if (!apiKey) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-background'>
        <div className='max-w-md rounded-lg border border-border bg-card p-8 shadow-lg'>
          <h1 className='mb-4 text-2xl font-bold text-foreground'>
            Unauthorized
          </h1>
          <p className='mb-4 text-muted-foreground'>
            API key is required to access this page.
          </p>
          <code className='block rounded bg-muted px-3 py-2 text-sm text-foreground'>
            Add ?api-key=YOUR_KEY to the URL
          </code>
        </div>
      </div>
    );
  }

  // Validate API key against API
  const validation = await validateApiKey(apiKey);

  if (!validation.is_valid) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-background'>
        <div className='max-w-md rounded-lg border border-border bg-card p-8 shadow-lg'>
          <h1 className='mb-4 text-2xl font-bold text-destructive'>
            Forbidden
          </h1>
          <p className='mb-4 text-muted-foreground'>
            {validation.message || "Invalid API key provided."}
          </p>
          <p className='text-sm text-muted-foreground'>
            Please provide a valid API key.
          </p>
        </div>
      </div>
    );
  }

  // API key is valid, render the client page with the key
  return <ClientPage apiKey={apiKey} />;
}
