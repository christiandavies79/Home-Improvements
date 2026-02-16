import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

// List all spaces
router.get('/', requireAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const spaces = db.prepare(`
    SELECT s.*, COUNT(p.id) as project_count
    FROM spaces s
    LEFT JOIN projects p ON p.space_id = s.id
    GROUP BY s.id
    ORDER BY s.name
  `).all() as any[];

  res.json(spaces.map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    projectCount: s.project_count,
    createdBy: s.created_by,
  })));
});

// Create space
router.post('/', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { name, icon } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Space name is required' });
    return;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO spaces (id, name, icon, created_by) VALUES (?, ?, ?, ?)').run(
    id, name, icon || 'home', req.session.userId
  );

  res.status(201).json({ id, name, icon: icon || 'home' });
});

// Update space
router.put('/:id', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { name, icon } = req.body;

  db.prepare('UPDATE spaces SET name = COALESCE(?, name), icon = COALESCE(?, icon) WHERE id = ?').run(
    name || null, icon || null, req.params.id
  );

  const space = db.prepare('SELECT * FROM spaces WHERE id = ?').get(req.params.id) as any;
  if (!space) {
    res.status(404).json({ error: 'Space not found' });
    return;
  }

  res.json({ id: space.id, name: space.name, icon: space.icon });
});

// Delete space
router.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM spaces WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
