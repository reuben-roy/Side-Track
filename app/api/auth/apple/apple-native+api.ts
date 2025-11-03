import { verifyAndCreateTokens } from "@/helper/apple-auth";

/**
 * To verify the identity token, your app server must:
 * Verify the JWS E256 signature using the server's public key
 * Verify the nonce for the authentication
 * Verify that the iss field contains https://appleid.apple.com
 * Verify that the aud field is the developer's client_id
 * Verify that the time is earlier than the exp value of the token
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identityToken, rawNonce, givenName, familyName, email } = body;
    
    const { accessToken, refreshToken } = await verifyAndCreateTokens({
      identityToken,
      rawNonce,
      givenName,
      familyName,
      email,
    });

    return Response.json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Apple token verification failed:", error);
    return Response.json(
      { 
        error: "Invalid token",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 401 }
    );
  }
}