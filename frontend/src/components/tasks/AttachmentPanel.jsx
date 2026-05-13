import { useState, useRef, useEffect } from 'react';
import {
  Paperclip, Upload, Trash2, Download,
  FileText, FileSpreadsheet, Image, File, X,
  Send, CheckCircle,
} from 'lucide-react';
import { attachmentService } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Spinner } from '../ui/Spinner.jsx';

async function downloadFile(att, onError) {
  try {
    const token = localStorage.getItem('token');
    const res   = await fetch(`/api/attachments/${att.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = att.fileName;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch { onError(); }
}

function fileIcon(mime = '') {
  if (mime === 'application/pdf')                          return <FileText size={14} className="text-danger" />;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
    return <FileSpreadsheet size={14} className="text-success" />;
  if (mime.startsWith('image/'))                          return <Image size={14} className="text-brand-light" />;
  if (mime.includes('word'))                              return <FileText size={14} className="text-brand-light" />;
  return <File size={14} className="text-base-200" />;
}

function fmtSize(b) {
  if (b < 1024)         return `${b} B`;
  if (b < 1024 * 1024)  return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/* ── Lista de arquivos ─────────────────────────────── */
function FileList({ items, user, onRemove, onDownload }) {
  if (!items.length) return <p className="text-xs text-base-200 italic py-1 px-1">Nenhum arquivo.</p>;
  return (
    <div className="space-y-1.5">
      {items.map(att => (
        <div key={att.id}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-base-600 group hover:bg-base-500/60 transition-colors">
          {fileIcon(att.mimeType)}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-base-50 truncate">{att.fileName}</p>
            <p className="text-[10px] text-base-200">{fmtSize(att.fileSize)} · {att.uploadedBy?.name}</p>
          </div>
          <button
            type="button"
            onClick={() => onDownload(att)}
            className="text-base-300 hover:text-brand-light transition-colors p-1 opacity-0 group-hover:opacity-100"
            title="Baixar"
          >
            <Download size={13} />
          </button>
          {(att.uploadedById === user?.id || user?.isAdmin || user?.isManager) && (
            <button
              type="button"
              onClick={() => onRemove(att)}
              className="text-base-300 hover:text-danger transition-colors p-1 opacity-0 group-hover:opacity-100"
              title="Remover"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Área de upload de uma seção ───────────────────── */
function UploadArea({ label, staged, onPick, onRemoveStaged, onSend, uploading }) {
  const inputRef = useRef();
  return (
    <div className="mt-2 space-y-1.5">
      {staged.map((f, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand/30 bg-brand/10 text-xs">
          {fileIcon(f.type)}
          <span className="flex-1 truncate text-base-100">{f.name}</span>
          <span className="text-base-200 flex-shrink-0">{fmtSize(f.size)}</span>
          <button type="button" onClick={() => onRemoveStaged(i)} className="text-base-200 hover:text-danger p-0.5">
            <X size={12} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input ref={inputRef} type="file" multiple className="hidden"
          accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
          onChange={e => { onPick(Array.from(e.target.files || [])); e.target.value = ''; }} />
        <button type="button" onClick={() => inputRef.current?.click()}
          className="btn btn-ghost btn-sm gap-1.5 text-xs flex-1 border-dashed border-base-400">
          <Paperclip size={12} /> {label}
        </button>
        {staged.length > 0 && (
          <button type="button" onClick={onSend} disabled={uploading}
            className="btn-primary btn-sm gap-1.5 text-xs">
            {uploading ? <Spinner size={12} /> : <Upload size={12} />}
            Enviar {staged.length}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Componente principal ──────────────────────────── */
export function AttachmentPanel({ task }) {
  const toast    = useToast();
  const { user } = useAuth();

  const [all,         setAll        ] = useState([]);
  const [loading,     setLoading    ] = useState(true);
  const [stagedSend,  setStagedSend ] = useState([]);  // arquivos do remetente
  const [stagedResp,  setStagedResp ] = useState([]);  // arquivos da resposta
  const [uploadSend,  setUploadSend ] = useState(false);
  const [uploadResp,  setUploadResp ] = useState(false);

  const taskId    = task?.id;
  const senderId  = task?.fromId ?? task?.from?.id;
  const isSender  = user?.id === senderId;

  useEffect(() => {
    if (!taskId) return;
    attachmentService.list(taskId)
      .then(setAll)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId]);

  // Separa: arquivos do remetente vs respostas
  const senderFiles   = all.filter(a => a.uploadedById === senderId);
  const responseFiles = all.filter(a => a.uploadedById !== senderId);

  function addStaged(setter, files) {
    setter(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...files.filter(f => !existing.has(f.name + f.size))];
    });
  }

  async function handleUpload(staged, setStaged, setUploading) {
    if (!staged.length) return;
    setUploading(true);
    try {
      const created = await attachmentService.upload(taskId, staged);
      setAll(prev => [...prev, ...created]);
      setStaged([]);
      toast(`${created.length} arquivo${created.length > 1 ? 's' : ''} enviado${created.length > 1 ? 's' : ''}`, 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Erro ao enviar', 'error');
    } finally { setUploading(false); }
  }

  async function handleRemove(att) {
    if (!confirm(`Remover "${att.fileName}"?`)) return;
    try {
      await attachmentService.remove(att.id);
      setAll(prev => prev.filter(a => a.id !== att.id));
      toast('Arquivo removido', 'success');
    } catch { toast('Erro ao remover', 'error'); }
  }

  function handleDownload(att) {
    downloadFile(att, () => toast('Erro ao baixar arquivo', 'error'));
  }

  if (loading) return <div className="flex justify-center py-4"><Spinner size={18} /></div>;

  return (
    <div className="space-y-4">

      {/* ── Seção 1: Remetente ── */}
      <div>
        <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Send size={10} className="text-brand-light" />
          Arquivos do Remetente
          <span className="text-base-400 font-normal normal-case tracking-normal">({senderFiles.length})</span>
        </p>
        <FileList items={senderFiles} user={user} onRemove={handleRemove} onDownload={handleDownload} />
        {isSender && (
          <UploadArea
            label="Anexar arquivo"
            staged={stagedSend}
            onPick={f => addStaged(setStagedSend, f)}
            onRemoveStaged={i => setStagedSend(prev => prev.filter((_, j) => j !== i))}
            onSend={() => handleUpload(stagedSend, setStagedSend, setUploadSend)}
            uploading={uploadSend}
          />
        )}
      </div>

      {/* Divisor */}
      <div className="border-t border-base-500" />

      {/* ── Seção 2: Resposta / Conclusão ── */}
      <div>
        <p className="text-[10px] font-semibold text-base-200 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <CheckCircle size={10} className="text-success" />
          Resposta / Conclusão
          <span className="text-base-400 font-normal normal-case tracking-normal">({responseFiles.length})</span>
        </p>
        <FileList items={responseFiles} user={user} onRemove={handleRemove} onDownload={handleDownload} />
        {!isSender && (
          <UploadArea
            label="Enviar resposta / comprovante"
            staged={stagedResp}
            onPick={f => addStaged(setStagedResp, f)}
            onRemoveStaged={i => setStagedResp(prev => prev.filter((_, j) => j !== i))}
            onSend={() => handleUpload(stagedResp, setStagedResp, setUploadResp)}
            uploading={uploadResp}
          />
        )}
      </div>

    </div>
  );
}
