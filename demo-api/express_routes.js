const express = require('express');
const app = express();
const router = express.Router();

/** 
 * Express User Management Endpoints
 */

// Simple GET
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Auth protected with body extraction
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    res.json({ token: 'abc-123' });
});

// Path params
router.get('/users/:id', (req, res) => {
    const id = req.params.id;
    res.json({ id });
});

// Query params and nested path
router.get('/users/search', (req, res) => {
    const query = req.query.q;
    const page = req.query.page;
    res.json({ users: [] });
});

app.use('/', router);
app.listen(3000, () => {
    console.log('🚀 Mock API Server running at http://localhost:3000');
});
