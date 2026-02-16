import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, getUploadsDir } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Multer config for photo uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getUploadsDir();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// List all projects
router.get('/', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { space_id, status, priority, assigned_to } = req.query;

  let query = `
    SELECT p.*,
      s.name as space_name, s.icon as space_icon,
      u.display_name as creator_name, u.avatar_color as creator_color,
      a.display_name as assignee_name, a.avatar_color as assignee_color,
      (SELECT COUNT(*) FROM project_photos WHERE project_id = p.id) as photo_count,
      (SELECT COUNT(*) FROM design_board_items WHERE project_id = p.id) as board_item_count
    FROM projects p
    LEFT JOIN spaces s ON p.space_id = s.id
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN users a ON p.assigned_to = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (space_id) { query += ' AND p.space_id = ?'; params.push(space_id); }
  if (status) { query += ' AND p.status = ?'; params.push(status); }
  if (priority) { query += ' AND p.priority = ?'; params.push(priority); }
  if (assigned_to) { query += ' AND p.assigned_to = ?'; params.push(assigned_to); }

  query += ' ORDER BY p.updated_at DESC';

  const projects = db.prepare(query).all(...params) as any[];

  res.json(projects.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    spaceId: p.space_id,
    spaceName: p.space_name,
    spaceIcon: p.space_icon,
    priority: p.priority,
    status: p.status,
    assignedTo: p.assigned_to,
    assigneeName: p.assignee_name,
    assigneeColor: p.assignee_color,
    estimatedBudget: p.estimated_budget,
    spentBudget: p.spent_budget,
    timeEstimate: p.time_estimate,
    dueDate: p.due_date,
    createdBy: p.created_by,
    creatorName: p.creator_name,
    creatorColor: p.creator_color,
    photoCount: p.photo_count,
    boardItemCount: p.board_item_count,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  })));
});

// Get single project with full details
router.get('/:id', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*,
      s.name as space_name, s.icon as space_icon,
      u.display_name as creator_name, u.avatar_color as creator_color,
      a.display_name as assignee_name, a.avatar_color as assignee_color
    FROM projects p
    LEFT JOIN spaces s ON p.space_id = s.id
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN users a ON p.assigned_to = a.id
    WHERE p.id = ?
  `).get(req.params.id) as any;

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const tags = db.prepare('SELECT tag_name FROM project_tags WHERE project_id = ?').all(req.params.id) as any[];
  const photos = db.prepare(`
    SELECT pp.*, u.display_name as uploader_name
    FROM project_photos pp
    LEFT JOIN users u ON pp.uploaded_by = u.id
    WHERE pp.project_id = ?
    ORDER BY pp.created_at DESC
  `).all(req.params.id) as any[];

  const comments = db.prepare(`
    SELECT pc.*, u.display_name as user_name, u.avatar_color
    FROM project_comments pc
    JOIN users u ON pc.user_id = u.id
    WHERE pc.project_id = ?
    ORDER BY pc.created_at ASC
  `).all(req.params.id) as any[];

  res.json({
    id: project.id,
    title: project.title,
    description: project.description,
    spaceId: project.space_id,
    spaceName: project.space_name,
    spaceIcon: project.space_icon,
    priority: project.priority,
    status: project.status,
    assignedTo: project.assigned_to,
    assigneeName: project.assignee_name,
    assigneeColor: project.assignee_color,
    estimatedBudget: project.estimated_budget,
    spentBudget: project.spent_budget,
    timeEstimate: project.time_estimate,
    dueDate: project.due_date,
    createdBy: project.created_by,
    creatorName: project.creator_name,
    creatorColor: project.creator_color,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    tags: tags.map(t => t.tag_name),
    photos: photos.map(p => ({
      id: p.id,
      filePath: `/uploads/${path.basename(p.file_path)}`,
      caption: p.caption,
      photoType: p.photo_type,
      uploaderName: p.uploader_name,
      createdAt: p.created_at,
    })),
    comments: comments.map(c => ({
      id: c.id,
      userId: c.user_id,
      userName: c.user_name,
      avatarColor: c.avatar_color,
      text: c.comment_text,
      createdAt: c.created_at,
    })),
  });
});

// Create project
router.post('/', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const {
    title, description, spaceId, priority, status,
    assignedTo, estimatedBudget, timeEstimate, dueDate, tags
  } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO projects (id, title, description, space_id, priority, status, assigned_to,
      estimated_budget, time_estimate, due_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    description || '',
    spaceId || null,
    priority || 'medium',
    status || 'not_started',
    assignedTo || null,
    estimatedBudget || 0,
    timeEstimate || '',
    dueDate || null,
    req.session.userId
  );

  // Add tags
  if (tags && Array.isArray(tags)) {
    const insertTag = db.prepare('INSERT INTO project_tags (id, project_id, tag_name) VALUES (?, ?, ?)');
    for (const tag of tags) {
      insertTag.run(uuidv4(), id, tag);
    }
  }

  // Log activity
  db.prepare('INSERT INTO activity_log (id, project_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)').run(
    uuidv4(), id, req.session.userId, 'created', `Created project "${title}"`
  );

  res.status(201).json({ id, title });
});

// Update project
router.put('/:id', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const {
    title, description, spaceId, priority, status,
    assignedTo, estimatedBudget, spentBudget, timeEstimate, dueDate, tags
  } = req.body;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  db.prepare(`
    UPDATE projects SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      space_id = ?,
      priority = COALESCE(?, priority),
      status = COALESCE(?, status),
      assigned_to = ?,
      estimated_budget = COALESCE(?, estimated_budget),
      spent_budget = COALESCE(?, spent_budget),
      time_estimate = COALESCE(?, time_estimate),
      due_date = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title || null,
    description !== undefined ? description : null,
    spaceId !== undefined ? spaceId : existing.space_id,
    priority || null,
    status || null,
    assignedTo !== undefined ? assignedTo : existing.assigned_to,
    estimatedBudget !== undefined ? estimatedBudget : null,
    spentBudget !== undefined ? spentBudget : null,
    timeEstimate !== undefined ? timeEstimate : null,
    dueDate !== undefined ? dueDate : existing.due_date,
    req.params.id
  );

  // Update tags if provided
  if (tags !== undefined && Array.isArray(tags)) {
    db.prepare('DELETE FROM project_tags WHERE project_id = ?').run(req.params.id);
    const insertTag = db.prepare('INSERT INTO project_tags (id, project_id, tag_name) VALUES (?, ?, ?)');
    for (const tag of tags) {
      insertTag.run(uuidv4(), req.params.id, tag);
    }
  }

  // Log activity
  const changes: string[] = [];
  if (status && status !== existing.status) changes.push(`status to "${status}"`);
  if (priority && priority !== existing.priority) changes.push(`priority to "${priority}"`);
  if (assignedTo !== undefined && assignedTo !== existing.assigned_to) changes.push('assignment');

  if (changes.length > 0) {
    db.prepare('INSERT INTO activity_log (id, project_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), req.params.id, req.session.userId, 'updated', `Changed ${changes.join(', ')}`
    );
  }

  res.json({ ok: true });
});

// Delete project
router.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const db = getDb();

  // Delete associated photo files
  const photos = db.prepare('SELECT file_path FROM project_photos WHERE project_id = ?').all(req.params.id) as any[];
  for (const photo of photos) {
    try { fs.unlinkSync(photo.file_path); } catch {}
  }

  // Delete associated design board photo files
  const boardPhotos = db.prepare("SELECT file_path FROM design_board_items WHERE project_id = ? AND item_type = 'photo' AND file_path != ''").all(req.params.id) as any[];
  for (const photo of boardPhotos) {
    try { fs.unlinkSync(photo.file_path); } catch {}
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Upload photos to project
router.post('/:id/photos', requireAuth, upload.array('photos', 10), (req: Request, res: Response) => {
  const db = getDb();
  const files = req.files as Express.Multer.File[];
  const { photoType, caption } = req.body;

  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const insertPhoto = db.prepare(
    'INSERT INTO project_photos (id, project_id, file_path, caption, photo_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const inserted = files.map(file => {
    const photoId = uuidv4();
    insertPhoto.run(photoId, req.params.id, file.path, caption || '', photoType || 'general', req.session.userId);
    return {
      id: photoId,
      filePath: `/uploads/${file.filename}`,
      caption: caption || '',
      photoType: photoType || 'general',
    };
  });

  db.prepare('UPDATE projects SET updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);

  res.status(201).json(inserted);
});

// Delete photo
router.delete('/:id/photos/:photoId', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const photo = db.prepare('SELECT file_path FROM project_photos WHERE id = ? AND project_id = ?').get(
    req.params.photoId, req.params.id
  ) as any;

  if (!photo) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }

  try { fs.unlinkSync(photo.file_path); } catch {}
  db.prepare('DELETE FROM project_photos WHERE id = ?').run(req.params.photoId);

  res.json({ ok: true });
});

// Add comment to project
router.post('/:id/comments', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Comment text is required' });
    return;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO project_comments (id, project_id, user_id, comment_text) VALUES (?, ?, ?, ?)').run(
    id, req.params.id, req.session.userId, text
  );

  db.prepare('UPDATE projects SET updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);

  const user = db.prepare('SELECT display_name, avatar_color FROM users WHERE id = ?').get(req.session.userId!) as any;

  res.status(201).json({
    id,
    userId: req.session.userId,
    userName: user.display_name,
    avatarColor: user.avatar_color,
    text,
    createdAt: new Date().toISOString(),
  });
});

// Get activity log
router.get('/activity/recent', requireAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const activities = db.prepare(`
    SELECT al.*, u.display_name as user_name, u.avatar_color, p.title as project_title
    FROM activity_log al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN projects p ON al.project_id = p.id
    ORDER BY al.created_at DESC
    LIMIT 50
  `).all() as any[];

  res.json(activities.map(a => ({
    id: a.id,
    projectId: a.project_id,
    projectTitle: a.project_title,
    userId: a.user_id,
    userName: a.user_name,
    avatarColor: a.avatar_color,
    action: a.action,
    details: a.details,
    createdAt: a.created_at,
  })));
});

export default router;
