import dotenv from 'dotenv';
dotenv.config();

export async function createMidtransSnapTransaction(options: {
  orderId: string;
  grossAmount: number;
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

  const payload = {
    transaction_details: {
      order_id: options.orderId,
      gross_amount: options.grossAmount,
    },
    credit_card: {
      secure: true,
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
