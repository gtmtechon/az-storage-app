// utils/keyvault.js
const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");

async function getSecret(secretName) {
  const keyVaultUri = process.env.KEY_VAULT_URI;
  if (!keyVaultUri) {
    throw new Error("KEY_VAULT_URI is not defined in environment variables.");
  }

  const credential = new DefaultAzureCredential();
  const client = new SecretClient(keyVaultUri, credential);

  try {
    const secret = await client.getSecret(secretName);
    return secret.value;
  } catch (error) {
    console.error(`Failed to retrieve secret '${secretName}' from Key Vault:`, error);
    throw error;
  }
}

module.exports = { getSecret };