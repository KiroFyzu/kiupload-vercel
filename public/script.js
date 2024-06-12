function toggleUploadOption() {
  const uploadFromFile = document.getElementById('uploadFromFile');
  const uploadFromUrl = document.getElementById('uploadFromUrl');
  const fileOption = document.getElementById('fileOption');
  const urlOption = document.getElementById('urlOption');
  
  if (fileOption.checked) {
    uploadFromFile.style.display = 'block';
    uploadFromUrl.style.display = 'none';
  } else if (urlOption.checked) {
    uploadFromFile.style.display = 'none';
    uploadFromUrl.style.display = 'block';
  }
}

function handleDrop(event) {
  event.preventDefault();
  const files = event.dataTransfer.files;
  if (files.length) {
    const input = document.getElementById('fileInput');
    input.files = files;
    displayPreview(files[0]);
  }
}

function handlePaste(event) {
  const items = event.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      const file = items[i].getAsFile();
      const input = document.getElementById('fileInput');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      displayPreview(file);
    }
  }
}

function displayPreview(file) {
  const previewContainer = document.getElementById('preview');
  previewContainer.innerHTML = '';
  const fileType = file.type;

  if (fileType.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    previewContainer.appendChild(img);
  } else if (fileType.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.controls = true;
    previewContainer.appendChild(video);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  dropzone.addEventListener('dragover', (event) => event.preventDefault());
  dropzone.addEventListener('drop', handleDrop);
  document.addEventListener('paste', handlePaste);

  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      displayPreview(file);
    }
  });

  const themeToggle = document.getElementById('themeToggle');
  themeToggle.addEventListener('change', () => {
    document.body.setAttribute('data-theme', themeToggle.checked ? 'dark' : 'light');
  });
});