import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auditSensitiveAttempt, requireStaffPermission } from '@/lib/staffAuth';

export const runtime = 'nodejs';

export async function POST(req) {
  const { action, reason = null } = await req.json();
  const auth = await requireStaffPermission(req, {
    permission: 'billing.manage',
    ownerOnly: true,
    entityType: 'billing_config',
    action: action === 'update' ? 'stripe_branding.update' : 'stripe_branding.read',
    reason,
    metadata: { route: '/api/admin/stripe-branding' },
  });
  if (!auth.ok) return auth.response;
  if (action === 'update' && !reason) {
    return NextResponse.json({ error: 'reason is required' }, { status: 422 });
  }
  try {
    if (action === 'update') {
      // Update Stripe account branding via direct API call
      // Stripe doesn't allow accounts.update('self') for standard accounts,
      // but we can update the statement descriptor on each payment intent
      // and upload a logo for the checkout/receipt pages

      // Upload the logo to Stripe for branded receipts
      let logoFile = null;
      try {
        // Download the logo from our site
        const logoRes = await fetch('https://junkhaul.ca/logo/stampede-alt.png');
        const logoBuffer = await logoRes.arrayBuffer();
        const formData = new FormData();
        formData.append('purpose', 'business_logo');
        formData.append('file', new Blob([logoBuffer], { type: 'image/png' }), 'stampede-alt.png');

        const uploadRes = await fetch('https://api.stripe.com/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          },
          body: formData,
        });
        logoFile = await uploadRes.json();
      } catch (e) {
        console.error('Logo upload failed:', e);
      }

      // Update the account with the new logo and branding
      const updateData = {
        business_profile: {
          name: 'Junk Haul Calgary',
          url: 'https://junkhaul.ca',
          product_description: 'Junk removal service in Calgary, Alberta. Fully licensed and insured.',
        },
        settings: {
          payments: {
            statement_descriptor: 'JUNK HAUL CALGARY',
          },
          branding: {
            primary_color: '#f97316',
            secondary_color: '#1a1a1a',
          },
        },
      };

      if (logoFile?.id) {
        updateData.business_profile.logo = logoFile.id;
      }

      // Use the raw API to update the account
      const res = await fetch('https://api.stripe.com/v1/accounts/' + 'acct_1TpfJQPM0KC3Ztg7', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(flatten(updateData)),
      });
      const result = await res.json();

      await auditSensitiveAttempt({
        context: auth.context,
        allowed: true,
        permission: 'billing.manage',
        entityType: 'billing_config',
        action: 'stripe_branding.update',
        reason,
        after: { result: result.error ? 'error' : 'updated', account: 'acct_1TpfJQPM0KC3Ztg7' },
      });

      return NextResponse.json({
        ok: res.ok,
        logo: logoFile?.id || 'upload failed',
        result: result.error ? result.error.message : 'Account updated',
      });
    }

    // Default: get current account info
    const account = await stripe.accounts.retrieve('self');
    return NextResponse.json({
      ok: true,
      account: {
        id: account.id,
        business_name: account.business_profile?.name,
        url: account.business_profile?.url,
        statement_descriptor: account.settings?.payments?.statement_descriptor,
        branding: account.settings?.branding,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Flatten nested object for URLSearchParams
function flatten(obj, prefix = '') {
  const params = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(params, flatten(value, fullKey));
    } else if (value !== null && value !== undefined) {
      params[fullKey] = value;
    }
  }
  return params;
}
