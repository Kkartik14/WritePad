import express from 'express';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    res.json({ message: 'Authenticated', user: payload });
  } catch (error: any) {
  console.error('Google OAuth token verification failed:', error);
  res.status(401).json({ error: 'Invalid token' });
}
});

export default router;
