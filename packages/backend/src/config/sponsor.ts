import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

// Sponsor wallet configuration
const SPONSOR_PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY || '';

if (!SPONSOR_PRIVATE_KEY) {
  console.warn('⚠️  SPONSOR_PRIVATE_KEY not set in .env - sponsored transactions will not work!');
}

// Initialize sponsor keypair
let sponsorKeypair: Ed25519Keypair | null = null;
try {
  if (SPONSOR_PRIVATE_KEY) {
    // Private key hex string'i Uint8Array'e çevir
    const privateKeyBytes = new Uint8Array(
      SPONSOR_PRIVATE_KEY.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    // Ed25519Keypair.fromSecretKey expects 32-byte seed, but getSecretKey() returns 64 bytes
    // Take only the first 32 bytes (the seed portion)
    const seed = privateKeyBytes.slice(0, 32);

    sponsorKeypair = Ed25519Keypair.fromSecretKey(seed);
    console.log('✅ Sponsor wallet loaded:', sponsorKeypair.getPublicKey().toSuiAddress());
  }
} catch (error) {
  console.error('❌ Failed to load sponsor wallet:', error);
}

// Sui client
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

export const PACKAGE_ID = process.env.VITE_SUI_PACKAGE_ID || '';

/**
 * Execute a sponsored transaction
 * The sponsor pays the gas fee, user's action is free
 */
export async function executeSponsoredTransaction(transaction: Transaction) {
  if (!sponsorKeypair) {
    throw new Error('Sponsor wallet not configured');
  }

  try {
    // Sign and execute with sponsor wallet
    const result = await suiClient.signAndExecuteTransaction({
      transaction,
      signer: sponsorKeypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    return result;
  } catch (error) {
    console.error('Sponsored transaction failed:', error);
    throw error;
  }
}

export { suiClient, sponsorKeypair };
