<script>
  export let label = 'Subir archivo';
  export let accept = '*/*';
  export let icon = '📁';
  export let onFileSelected;
  export let disabled = false;
  export let uploading = false;
  export let selectedFile = null;
  export let variant = 'default'; // 'default', 'rubric', 'primary'

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (file && onFileSelected) {
      onFileSelected(file);
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getFileIcon(filename) {
    if (!filename) return icon;
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      csv: '📋',
      txt: '📃'
    };
    return icons[ext] || icon;
  }
</script>

<div class="file-upload-wrapper" class:rubric-variant={variant === 'rubric'} class:primary-variant={variant === 'primary'}>
  <input
    type="file"
    id="file-upload"
    accept={accept}
    on:change={handleFileChange}
    disabled={disabled || uploading}
    class="file-input"
  />
  <label for="file-upload" class="file-upload-btn" class:disabled={disabled || uploading} class:uploading={uploading}>
    <span class="upload-icon">
      {uploading ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' : (selectedFile ? getFileIcon(selectedFile.name) : icon)}
    </span>
    <span class="upload-text">
      {uploading ? 'Subiendo...' : (selectedFile ? 'Cambiar archivo' : label)}
    </span>
    <span class="upload-arrow">→</span>
  </label>
  {#if selectedFile}
    <div class="file-info">
      <span class="file-icon">{getFileIcon(selectedFile.name)}</span>
      <div class="file-details">
        <span class="file-name">{selectedFile.name}</span>
        <span class="file-size">{formatFileSize(selectedFile.size)}</span>
      </div>
      <button class="remove-file" on:click={(e) => { e.preventDefault(); selectedFile = null; if (onFileSelected) onFileSelected(null); }} title="Eliminar archivo">×</button>
    </div>
  {/if}
</div>

<style>
  .file-upload-wrapper {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .file-input {
    display: none;
  }

  .file-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border-radius: 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px dashed rgba(255, 255, 255, 0.3);
    width: fit-content;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    position: relative;
    overflow: hidden;
  }

  .file-upload-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .file-upload-btn:hover:not(.disabled)::before {
    left: 100%;
  }

  .file-upload-btn:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .file-upload-btn.uploading {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .file-upload-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .rubric-variant .file-upload-btn {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    box-shadow: 0 4px 15px rgba(17, 153, 142, 0.3);
  }

  .rubric-variant .file-upload-btn:hover:not(.disabled) {
    box-shadow: 0 6px 20px rgba(17, 153, 142, 0.4);
  }

  .primary-variant .file-upload-btn {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
  }

  .primary-variant .file-upload-btn:hover:not(.disabled) {
    box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
  }

  .upload-icon {
    font-size: 20px;
    line-height: 1;
  }

  .upload-icon :global(svg) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .upload-text {
    white-space: nowrap;
  }

  .upload-arrow {
    font-size: 16px;
    opacity: 0.8;
    transition: transform 0.3s ease;
  }

  .file-upload-btn:hover .upload-arrow {
    transform: translateX(4px);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border: 1px solid rgba(102, 126, 234, 0.2);
    border-radius: 10px;
    font-size: 13px;
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .file-icon {
    font-size: 24px;
  }

  .file-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .file-name {
    color: var(--text);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    color: var(--muted);
    font-size: 11px;
    font-weight: 500;
  }

  .remove-file {
    background: rgba(239, 68, 68, 0.1);
    border: none;
    color: #ef4444;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    line-height: 1;
  }

  .remove-file:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.1);
  }
</style>
