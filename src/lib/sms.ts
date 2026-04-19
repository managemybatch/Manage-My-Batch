import { handleFirestoreError, OperationType } from '../firebase';

export interface SMSConfig {
  apiUrl: string;
  apiKey: string;
  senderId: string;
  messageParam: string;
  numberParam: string;
}

export async function sendSMS(config: SMSConfig | undefined, phoneNumber: string, message: string) {
  if (!config || !config.apiUrl) {
    console.warn('SMS Config missing or API URL not set');
    return { success: false, error: 'SMS Config missing' };
  }

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.append(config.apiKey ? 'api_key' : '', config.apiKey); // Basic example, usually depends on API
    // Most APIs use specific query params
    url.searchParams.append(config.messageParam || 'message', message);
    url.searchParams.append(config.numberParam || 'to', phoneNumber);
    if (config.senderId) {
      url.searchParams.append('senderid', config.senderId);
    }

    const response = await fetch(url.toString(), { method: 'GET' });
    if (response.ok) {
      return { success: true };
    } else {
      const text = await response.text();
      return { success: false, error: text || 'Failed to send SMS' };
    }
  } catch (error) {
    console.error('SMS Send Error:', error);
    return { success: false, error: 'Network error or invalid API URL' };
  }
}
