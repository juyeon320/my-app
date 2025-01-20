import express from 'express';
const router = express.Router();

router.get('/api/check_session', (req, res) => {
    if (req.session.user) {
        const { email, nickname, profileImage } = req.session.user;
        res.status(200).json({ user: { email, nickname, profileImage } });
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
});

export default router;