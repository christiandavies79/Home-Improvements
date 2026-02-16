import express from 'express';
import session from 'express-session';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import crypto from 'crypto';
import { getDb, getUploadsDir } from './db/schema';
import authRoutes from './routes/auth';
import spacesRoutes from './routes/spaces';
import projectsRoutes from './routes/projects';
import designBoardRoutes from './routes/designBoard';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Generate a session secret if not provided
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Trust proxy when behind Caddy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Serve uploaded files
app.use('/uploads', express.static(getUploadsDir()));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/projects', designBoardRoutes);

// Dashboard stats endpoint
app.get('/api/stats', (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const db = getDb();

  const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
  const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status != 'complete'").get() as { count: number };
  const completedProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'complete'").get() as { count: number };
  const totalBudget = db.prepare('SELECT COALESCE(SUM(estimated_budget), 0) as total FROM projects').get() as { total: number };
  const totalSpent = db.prepare('SELECT COALESCE(SUM(spent_budget), 0) as total FROM projects').get() as { total: number };

  const bySpace = db.prepare(`
    SELECT s.name, s.icon, COUNT(p.id) as count,
      SUM(CASE WHEN p.status = 'complete' THEN 1 ELSE 0 END) as completed
    FROM spaces s
    LEFT JOIN projects p ON p.space_id = s.id
    GROUP BY s.id
    HAVING count > 0
    ORDER BY count DESC
  `).all() as any[];

  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM projects WHERE status != 'complete'
    GROUP BY priority
  `).all() as any[];

  res.json({
    totalProjects: totalProjects.count,
    activeProjects: activeProjects.count,
    completedProjects: completedProjects.count,
    totalBudget: totalBudget.total,
    totalSpent: totalSpent.total,
    bySpace: bySpace.map(s => ({ name: s.name, icon: s.icon, count: s.count, completed: s.completed })),
    byPriority: byPriority.map(p => ({ priority: p.priority, count: p.count })),
  });
});

// Serve frontend in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Initialize DB on startup
getDb();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HomeForge server running on port ${PORT}`);
});
