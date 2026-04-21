import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        showDropdown: process.env.NEXT_PUBLIC_USER_LOGIN_DROPDOWN === 'true'
    });
}
