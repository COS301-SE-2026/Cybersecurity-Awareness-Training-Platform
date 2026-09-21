import { InfisicalSDK, SecretType } from '@infisical/sdk';
import { getInfisicalConfig } from '../config/env.js';

export type EmailProviderCredentialInput = {
  organisationId: string;
  profileId: string;
  credential: string;
};

type InfisicalConfig = ReturnType<typeof getInfisicalConfig>;
type SecretStoreOperation<T> = (client: InfisicalSDK, config: InfisicalConfig) => Promise<T>;

const EMAIL_PROVIDER_SECRET_NAME = 'SMTP_PASSWORD';

let infisicalClient: InfisicalSDK | null = null;

export class EmailProviderSecretStoreError extends Error {
  readonly reasonCode = 'EMAIL_PROVIDER_SECRET_STORE_UNAVAILABLE';

  constructor() {
    super('Email provider credential storage is unavailable');
    this.name = 'EmailProviderSecretStoreError';
  }
}

export async function createEmailProviderCredential(
  input: EmailProviderCredentialInput,
): Promise<void> {
  await runSecretStoreOperation(async (client, config) => {
    await ensureInfisicalFolder(client, config, '/', 'smtp');
    await ensureInfisicalFolder(client, config, '/smtp', input.organisationId);
    await ensureInfisicalFolder(client, config, `/smtp/${input.organisationId}`, input.profileId);
    await client.secrets().createSecret(EMAIL_PROVIDER_SECRET_NAME, {
      projectId: config.projectId,
      environment: config.environment,
      secretPath: getEmailProviderSecretPath(input.organisationId, input.profileId),
      secretValue: input.credential,
      type: SecretType.Shared,
    });
  });
}

export function getEmailProviderCredential(
  organisationId: string,
  profileId: string,
): Promise<string> {
  return runSecretStoreOperation(async (client, config) => {
    const secret = await client.secrets().getSecret({
      projectId: config.projectId,
      environment: config.environment,
      secretName: EMAIL_PROVIDER_SECRET_NAME,
      secretPath: getEmailProviderSecretPath(organisationId, profileId),
      type: SecretType.Shared,
      expandSecretReferences: false,
      includeImports: false,
      viewSecretValue: true,
    });

    if (secret.secretValue.length === 0) {
      throw new Error('Stored SMTP credential is empty');
    }

    return secret.secretValue;
  });
}

export async function replaceEmailProviderCredential(
  input: EmailProviderCredentialInput,
): Promise<void> {
  await runSecretStoreOperation(async (client, config) => {
    await client.secrets().updateSecret(EMAIL_PROVIDER_SECRET_NAME, {
      projectId: config.projectId,
      environment: config.environment,
      secretPath: getEmailProviderSecretPath(input.organisationId, input.profileId),
      secretValue: input.credential,
      type: SecretType.Shared,
    });
  });
}

export async function deleteEmailProviderCredential(
  organisationId: string,
  profileId: string,
): Promise<void> {
  await runSecretStoreOperation(async (client, config) => {
    await client.secrets().deleteSecret(EMAIL_PROVIDER_SECRET_NAME, {
      projectId: config.projectId,
      environment: config.environment,
      secretPath: getEmailProviderSecretPath(organisationId, profileId),
      type: SecretType.Shared,
    });
  });
}

function getEmailProviderSecretPath(organisationId: string, profileId: string): string {
  return `/smtp/${organisationId}/${profileId}`;
}

function getInfisicalClient(): InfisicalSDK {
  if (infisicalClient === null) {
    infisicalClient = new InfisicalSDK();
  }

  return infisicalClient;
}

async function ensureInfisicalFolder(
  client: InfisicalSDK,
  config: InfisicalConfig,
  parentPath: string,
  folderName: string,
): Promise<void> {
  const folders = await client.folders().listFolders({
    projectId: config.projectId,
    environment: config.environment,
    path: parentPath,
  });

  if (folders.some((folder) => folder.name === folderName)) {
    return;
  }

  try {
    await client.folders().create({
      projectId: config.projectId,
      environment: config.environment,
      path: parentPath,
      name: folderName,
    });
  } catch (error) {
    const currentFolders = await client.folders().listFolders({
      projectId: config.projectId,
      environment: config.environment,
      path: parentPath,
    });

    if (currentFolders.some((folder) => folder.name === folderName)) {
      return;
    }

    throw error;
  }
}

async function runSecretStoreOperation<T>(operation: SecretStoreOperation<T>): Promise<T> {
  try {
    const config = getInfisicalConfig();
    const client = getInfisicalClient();
    const authenticatedClient = await client
      .auth()
      .universalAuth.login({ clientId: config.clientId, clientSecret: config.clientSecret });

    return await operation(authenticatedClient, config);
  } catch {
    throw new EmailProviderSecretStoreError();
  }
}
