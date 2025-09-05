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


const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
let tokenClient;
let gapiInited = false;
let gisInited = false;

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
                console.error('PDF Read Error:', file.name, error);
                alert(`Error reading file "${file.name}". The file may be corrupt.`);
            }
        }
    }
    renderFileList();
}

function gapiLoaded() {
    gapi.load('client:picker', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    gapiInited = true;
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
    });
    gisInited = true;
}

window.gapiLoaded = gapiLoaded;
window.gisLoaded = gisLoaded;

googleDrivePicker.addEventListener('click', () => {
    if (!gapiInited || !gisInited) {
        alert('Google API is not ready. Please try again in a moment.');
        return;
    }
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error('Authentication error:', resp.error);
            throw (resp);
        }
        createPicker();
    };
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
});

Sortable.create(fileListElement, {
    animation: 150,
    onEnd: (evt) => {
        const [movedItem] = pdfFiles.splice(evt.oldIndex, 1);
        pdfFiles.splice(evt.newIndex, 0, movedItem);
        updateFileItemIndices();
    },
});

function createPicker() {
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("application/pdf");

    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED) // Add this line
        .setAppId(CLIENT_ID.split('-')[0])
        .setOAuthToken(gapi.client.getToken().access_token)
        .addView(view)
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
}

async function pickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        for (const doc of data.docs) {
            try {
                const fileId = doc.id;
                const res = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media',
                });
                const fileContent = res.body;
                const binaryData = new Uint8Array(fileContent.length);
                for (let i = 0; i < fileContent.length; i++) {
                    binaryData[i] = fileContent.charCodeAt(i);
                }
                const file = new File([binaryData.buffer], doc.name, { type: doc.mimeType });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                await handleFiles(dataTransfer.files);
            } catch (err) {
                console.error('Failed to retrieve or process file from Google Drive:', err);
                alert('Failed to retrieve or process the file.');
            }
        }
    }
}

function renderFileList() {
    fileListElement.innerHTML = '';
    pdfFiles.forEach((file) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `<span class="name">${file.name}</span><button class="remove-button">x</button>`;
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

function getFilenameFromInput(inputElement, defaultName) {
    let filename = inputElement.value.trim() || defaultName;
    if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
    }
    return filename;
}

mergeButton.addEventListener('click', async () => {
    setBusyState(mergeButton, 'Merging...');
    try {
        const filename = getFilenameFromInput(mergeFilenameInput, 'merged.pdf');
        const mergedPdf = await PDFLib.PDFDocument.create();
        for (const file of pdfFiles) {
            const copiedPages = await mergedPdf.copyPages(file.doc, file.doc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }
        const pdfBytes = await mergedPdf.save();
        downloadFile(pdfBytes, filename, 'application/pdf');
    } catch (error) {
        console.error('PDF Merge Error:', error);
        alert('An error occurred while merging the PDFs.');
    } finally {
        resetButtonState(mergeButton, 'Merge Files');
    }
});

splitButton.addEventListener('click', async () => {
    const rangeText = splitRangeInput.value.trim();
    if (!rangeText) {
        alert('Please enter a page range (e.g., 1-3, 5, 8-10).');
        return;
    }
    setBusyState(splitButton, 'Splitting...');
    try {
        const sourcePdf = pdfFiles[0];
        const defaultName = `split_${sourcePdf.name}`;
        const filename = getFilenameFromInput(splitFilenameInput, defaultName);
        const totalPages = sourcePdf.doc.getPageCount();
        const pageIndices = parsePageRange(rangeText, totalPages);
        if (pageIndices.length === 0) {
            alert('No valid pages were specified.');
            return;
        }
        const newPdf = await PDFLib.PDFDocument.create();
        const copiedPages = await newPdf.copyPages(sourcePdf.doc, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));
        const pdfBytes = await newPdf.save();
        downloadFile(pdfBytes, filename, 'application/pdf');
    } catch (error) {
        console.error('PDF Split Error:', error);
        alert(`An error occurred while splitting the PDF: ${error.message}`);
    } finally {
        resetButtonState(splitButton, 'Split File');
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

