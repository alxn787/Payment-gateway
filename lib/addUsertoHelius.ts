import { Helius} from 'helius-sdk'; // Replace with 'helius-sdk' in a production setting

export async function addUsertoHelius(pubkey: string) {
  try{

    const helius = new Helius(process.env.HELIUS_KEY as string);
    
    const webhookId = process.env.HELIUS_WEBHOOK_ID as string;
    
    const response = await helius.appendAddressesToWebhook(webhookId, [
      pubkey,
    ]);
    console.log('Updated webhook with new addresses:', response);
    return response;
  } catch (error) {
    console.error('Error adding user to Helius:', error);
  }

}
