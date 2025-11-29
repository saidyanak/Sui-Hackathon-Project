const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');

// Generate a new keypair for sponsor wallet
const keypair = Ed25519Keypair.generate();

const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex');
const publicKey = keypair.getPublicKey().toSuiAddress();

console.log('\n🔐 Sponsor Wallet Generated!\n');
console.log('Add this to your .env file:');
console.log('SPONSOR_PRIVATE_KEY=' + privateKey);
console.log('\n📍 Sponsor Wallet Address:');
console.log(publicKey);
console.log('\n⚠️  IMPORTANT: Fund this address with SUI tokens on testnet!');
console.log('🔗 Get testnet tokens: https://faucet.sui.io/');
console.log('\n');
