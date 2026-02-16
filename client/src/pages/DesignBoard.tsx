import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type ModalType = 'link' | 'note' | 'photo' | null;

export default function DesignBoard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);

  // Form state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const load = async () => {
    try {
      const [p, boardItems] = await Promise.all([
        api.projects.get(id!),
        api.designBoard.list(id!),
      ]);
      setProject(p);
      setItems(boardItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    await api.designBoard.addLink(id!, { title: linkTitle.trim(), url: linkUrl.trim() });
    setLinkUrl(''); setLinkTitle(''); setModalType(null);
    load();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    await api.designBoard.addNote(id!, { title: noteTitle.trim(), content: noteContent.trim() });
    setNoteContent(''); setNoteTitle(''); setModalType(null);
    load();
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;
    await api.designBoard.addPhoto(id!, photoFile, photoTitle.trim());
    setPhotoFile(null); setPhotoTitle(''); setModalType(null);
    load();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Remove this item?')) return;
    await api.designBoard.deleteItem(id!, itemId);
    load();
  };

  const handleComment = async (itemId: string) => {
    const text = commentInputs[itemId]?.trim();
    if (!text) return;
    await api.designBoard.addComment(id!, itemId, text);
    setCommentInputs({ ...commentInputs, [itemId]: '' });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-terra-200 border-t-terra-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <img src={lightboxPhoto} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to={`/projects/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {project?.title}
          </Link>
          <h1 className="font-display text-2xl font-bold text-gray-800">Design Board</h1>
          <p className="text-sm text-gray-500 mt-1">
            Collect inspiration, links, and ideas for this project
          </p>
        </div>

        {/* Add buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="btn-secondary text-sm" onClick={() => setModalType('link')}>
            + Link
          </button>
          <button className="btn-secondary text-sm" onClick={() => setModalType('note')}>
            + Note
          </button>
          <button className="btn-secondary text-sm" onClick={() => setModalType('photo')}>
            + Photo
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalType(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            {modalType === 'link' && (
              <form onSubmit={handleAddLink} className="space-y-4">
                <h2 className="font-display text-lg font-bold">Add a Link</h2>
                <div>
                  <label className="label">URL *</label>
                  <input
                    type="url"
                    className="input"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://www.example.com/product"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    className="input"
                    value={linkTitle}
                    onChange={e => setLinkTitle(e.target.value)}
                    placeholder="e.g., Subway tile from Home Depot"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setModalType(null)}>Cancel</button>
                  <button type="submit" className="btn-primary">Add Link</button>
                </div>
              </form>
            )}

            {modalType === 'note' && (
              <form onSubmit={handleAddNote} className="space-y-4">
                <h2 className="font-display text-lg font-bold">Add a Note</h2>
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    className="input"
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    placeholder="e.g., Color options"
                  />
                </div>
                <div>
                  <label className="label">Note *</label>
                  <textarea
                    className="input min-h-[100px] resize-y"
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    placeholder="Write your idea or note..."
                    autoFocus
                    required
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setModalType(null)}>Cancel</button>
                  <button type="submit" className="btn-primary">Add Note</button>
                </div>
              </form>
            )}

            {modalType === 'photo' && (
              <form onSubmit={handleAddPhoto} className="space-y-4">
                <h2 className="font-display text-lg font-bold">Add Inspiration Photo</h2>
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    className="input"
                    value={photoTitle}
                    onChange={e => setPhotoTitle(e.target.value)}
                    placeholder="e.g., Kitchen backsplash idea"
                  />
                </div>
                <div>
                  <label className="label">Photo *</label>
                  <input
                    type="file"
                    className="input"
                    accept="image/*"
                    onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setModalType(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={!photoFile}>Add Photo</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Board Grid (Masonry) */}
      {items.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">&#127912;</div>
          <h3 className="font-display text-lg font-bold text-gray-700 mb-2">Start your design board</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Pin links to products you like, upload inspiration photos, or jot down ideas.
            This is your shared brainstorming space!
          </p>
          <div className="flex justify-center gap-2">
            <button className="btn-secondary text-sm" onClick={() => setModalType('link')}>Add a Link</button>
            <button className="btn-secondary text-sm" onClick={() => setModalType('note')}>Add a Note</button>
            <button className="btn-secondary text-sm" onClick={() => setModalType('photo')}>Add a Photo</button>
          </div>
        </div>
      ) : (
        <div className="masonry-grid">
          {items.map(item => (
            <div key={item.id} className="card group">
              {/* Item header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: item.avatarColor || '#ccc' }}
                  >
                    {item.addedByName?.charAt(0)}
                  </div>
                  <span className="text-xs text-gray-500 truncate">{item.addedByName}</span>
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content by type */}
              {item.itemType === 'link' && (
                <div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-terra-600 hover:text-terra-700 font-medium text-sm break-all"
                  >
                    {item.title || item.url}
                  </a>
                  {item.title && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{item.url}</p>
                  )}
                  {item.content && (
                    <p className="text-sm text-gray-600 mt-2">{item.content}</p>
                  )}
                </div>
              )}

              {item.itemType === 'note' && (
                <div>
                  {item.title && (
                    <h4 className="font-medium text-gray-800 text-sm mb-1">{item.title}</h4>
                  )}
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.content}</p>
                </div>
              )}

              {item.itemType === 'photo' && (
                <div>
                  {item.title && (
                    <h4 className="font-medium text-gray-800 text-sm mb-2">{item.title}</h4>
                  )}
                  <img
                    src={item.filePath}
                    alt={item.title || 'Inspiration'}
                    className="w-full rounded-lg cursor-pointer"
                    onClick={() => setLightboxPhoto(item.filePath)}
                  />
                  {item.content && (
                    <p className="text-sm text-gray-600 mt-2">{item.content}</p>
                  )}
                </div>
              )}

              {/* Comments */}
              {item.comments?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-warm-100 space-y-2">
                  {item.comments.map((c: any) => (
                    <div key={c.id} className="flex gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                        style={{ backgroundColor: c.avatarColor }}
                      >
                        {c.userName.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-700">{c.userName}</span>
                        <p className="text-xs text-gray-600">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment */}
              <div className="mt-2 flex gap-1">
                <input
                  type="text"
                  className="input text-xs py-1"
                  placeholder="Comment..."
                  value={commentInputs[item.id] || ''}
                  onChange={e => setCommentInputs({ ...commentInputs, [item.id]: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') handleComment(item.id); }}
                />
                <button
                  className="btn-ghost text-xs px-2"
                  onClick={() => handleComment(item.id)}
                >
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
