import dotenv from 'dotenv';
dotenv.config();

export async function createMidtransSnapTransaction(options: {
  orderId: string;
  grossAmount: number;
  expiryMinutes?: number;
  customerDetails?: {
    name?: string;
    email?: string;
  };
}): Promise<{ token: string; redirect_url: string } | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey || serverKey.includes('your-midtrans-')) {
    console.warn(
      '[Midtrans Helper WARNING]: MIDTRANS_SERVER_KEY is not configured or still placeholder!',
    );
    return null;
  }

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const baseUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  // Susun header Basic Auth menggunakan Base64 encoding ServerKey
  const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');

  const expiryDuration = options.expiryMinutes || 15;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const payload: any = {
    transaction_details: {
      order_id: options.orderId,
      gross_amount: options.grossAmount,
    },
    credit_card: {
      secure: true,
    },
    expiry: {
      unit: 'minute',
      duration: expiryDuration,
    },
    callbacks: {
      finish: `${frontendUrl}/my-orders?order_id=${options.orderId}`,
    },
    customer_details: options.customerDetails
      ? {
          first_name: options.customerDetails.name || 'Customer',
          email: options.customerDetails.email,
        }
      : undefined,
  };

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Midtrans API responded with status ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    return {
      token: data.token,
      redirect_url: data.redirect_url,
    };
  } catch (error) {
    console.error('[Midtrans Error]: Failed to create transaction:', error);
    return null;
  }
}

export async function getMidtransTransactionStatus(orderId: string): Promise<any | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey || serverKey.includes('your-midtrans-')) {
    return null;
  }

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const url = isProduction
    ? `https://api.midtrans.com/v2/${orderId}/status`
    : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

  const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Midtrans Status Error]:', error);
    return null;
  }
}
