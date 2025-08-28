const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const googleDrivePicker = document.getElementById('google-drive-picker');
const fileListElement = document.getElementById('file-list');
const mergeButton = document.getElementById('merge-button');
const splitButton = document.getElementById('split-button');
const splitRangeInput = document.getElementById('split-range');
const mergeFilenameInput = document.getElementById('merge-filename');
const splitFilenameInput = document.getElementById('split-filename');

let pdfFiles = [];

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('active');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('active');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('active');
    if (e.dataTransfer?.files) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', (e) => {
    const target = e.target;
    if (target.files) {
        handleFiles(target.files);
    }
});

async function handleFiles(files) {
    for (const file of Array.from(files)) {
        if (file.type === 'application/pdf') {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                pdfFiles.push({ name: file.name, doc: pdfDoc });
            } catch (error) {
                console.error('PDFファイルの読み込みに失敗しました:', file.name, error);
                alert(`「${file.name}」の読み込みに失敗しました。ファイルが破損している可能性があります。`);
            }
        }
    }
    renderFileList();
}

// TODO: Google Drive連携を実装
googleDrivePicker.addEventListener('click', () => {
    alert('Google Drive連携は未実装です。');
});

Sortable.create(fileListElement, {
    animation: 150,
    onEnd: (evt) => {
        const [movedItem] = pdfFiles.splice(evt.oldIndex, 1);
        pdfFiles.splice(evt.newIndex, 0, movedItem);
        updateFileItemIndices();
    },
});

function renderFileList() {
    fileListElement.innerHTML = '';
    pdfFiles.forEach((file) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span class="name">${file.name}</span>
            <button class="remove-button">x</button>
        `;
        fileListElement.appendChild(item);
    });
    updateFileItemIndices();
    updateButtonState();
}

function updateFileItemIndices() {
    const items = fileListElement.children;
    for (let i = 0; i < items.length; i++) {
        const removeButton = items[i].querySelector('.remove-button');
        if (removeButton) {
            removeButton.dataset.index = i.toString();
        }
    }
}

fileListElement.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('remove-button')) {
        const index = parseInt(target.dataset.index, 10);
        pdfFiles.splice(index, 1);
        renderFileList();
    }
});

function updateButtonState() {
    const fileCount = pdfFiles.length;
    mergeButton.disabled = fileCount < 2;
    splitButton.disabled = fileCount !== 1;
    splitRangeInput.disabled = fileCount !== 1;
}

mergeButton.addEventListener('click', async () => {
    setBusyState(mergeButton, '結合中...');
    try {
        // フォームからファイル名を取得、空ならデフォルト値を使用
        let filename = mergeFilenameInput.value.trim() || 'merged.pdf';
        // 末尾に .pdf がなければ追加
        if (!filename.toLowerCase().endsWith('.pdf')) {
            filename += '.pdf';
        }

        const mergedPdf = await PDFLib.PDFDocument.create();
        for (const file of pdfFiles) {
            const copiedPages = await mergedPdf.copyPages(file.doc, file.doc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }
        const pdfBytes = await mergedPdf.save();
        downloadFile(pdfBytes, filename, 'application/pdf');

    } catch (error) {
        console.error('PDFの結合に失敗しました:', error);
        alert('PDFの結合中にエラーが発生しました。');
    } finally {
        resetButtonState(mergeButton, '結合を実行');
    }
});

// script.js
splitButton.addEventListener('click', async () => {
    const rangeText = splitRangeInput.value.trim();
    if (!rangeText) {
        alert('ページ範囲を入力してください (例: 1-3, 5, 8-10)');
        return;
    }
    setBusyState(splitButton, '分割中...');
    try {
        const sourcePdf = pdfFiles[0];
        
        // フォームからファイル名を取得、空なら元のファイル名ベースのデフォルト値
        let filename = splitFilenameInput.value.trim() || `split_${sourcePdf.name}`;
        // 末尾に .pdf がなければ追加
        if (!filename.toLowerCase().endsWith('.pdf')) {
            filename += '.pdf';
        }

        const totalPages = sourcePdf.doc.getPageCount();
        const pageIndices = parsePageRange(rangeText, totalPages);
        if (pageIndices.length === 0) {
            alert('有効なページ番号が指定されていません。');
            return;
        }
        const newPdf = await PDFLib.PDFDocument.create();
        const copiedPages = await newPdf.copyPages(sourcePdf.doc, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));
        const pdfBytes = await newPdf.save();
        
        downloadFile(pdfBytes, filename, 'application/pdf');

    } catch (error) {
        console.error('PDFの分割に失敗しました:', error);
        alert(`PDFの分割中にエラーが発生しました: ${error.message}`);
    } finally {
        resetButtonState(splitButton, '分割を実行');
    }
});
function parsePageRange(rangeText, maxPage) {
    const indices = new Set();
    rangeText.split(',').forEach(part => {
        const trimmedPart = part.trim();
        if (trimmedPart.includes('-')) {
            const [start, end] = trimmedPart.split('-').map(num => parseInt(num, 10));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    if (i > 0 && i <= maxPage) indices.add(i - 1);
                }
            }
        } else {
            const page = parseInt(trimmedPart, 10);
            if (!isNaN(page) && page > 0 && page <= maxPage) {
                indices.add(page - 1);
            }
        }
    });
    return Array.from(indices).sort((a, b) => a - b);
}

function setBusyState(button, text) {
    button.disabled = true;
    button.textContent = text;
}

function resetButtonState(button, text) {
    button.textContent = text;
    updateButtonState();
}

function downloadFile(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

updateButtonState();