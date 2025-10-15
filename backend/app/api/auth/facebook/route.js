import { NextResponse } from 'next/server';

export async function GET(request) {
    const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID,
        redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
        scope: 'email,public_profile',
        response_type: 'code',
    });

    const facebookAuthUrl = `https://www.facebook.com/v12.0/dialog/oauth?${params.toString()}`;

    return NextResponse.redirect(facebookAuthUrl);
}