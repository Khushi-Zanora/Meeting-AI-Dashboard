import { apiFetch } from '../../shared/api.js';
import { navigate } from '../router.js';

let inputMode = 'audio';
let selectedFile = null;

export const renderNewMeeting = (el) => {
  el.innerHTML = `
    <h2 class="section-title">New meeting</h2>
    <div class="card" style="max-width:640px">

      <div class="field-group">
        <label class="field-label" for="mTitle">Title (optional)</label>
        <input class="field-input" id="mTitle" placeholder="e.g. Q3 Planning Sync" />
      </div>

      <div class="field-row">
        <div class="field-group" style="flex:1">
          <label class="field-label" for="mDate">Date</label>
          <input class="field-input" type="date" id="mDate" />
        </div>
        <div class="field-group" style="flex:1">
          <label class="field-label" for="mParticipants">Participants (optional)</label>
          <input class="field-input" id="mParticipants" placeholder="e.g. Jordan, Alex" />
        </div>
      </div>

      <div class="tab-switch">
        <button type="button" class="tab-btn active" id="tabAudio"><i class="ti ti-microphone" aria-hidden="true"></i>Upload audio</button>
        <button type="button" class="tab-btn" id="tabTranscript"><i class="ti ti-file-text" aria-hidden="true"></i>Paste transcript</button>
      </div>

      <div id="audioPane">
        <div class="dropzone" id="dropzone">
          <p class="dropzone-text" id="dropzoneText">Drop an audio file, or choose one below</p>
          <input type="file" id="audioInput" accept=".mp3,.wav" hidden />
            <button type="button" class="btn-secondary" id="browseBtn"><i class="ti ti-upload" aria-hidden="true"></i>Choose audio file</button>
        </div>
      </div>

      <div id="transcriptPane" style="display:none">
        <div class="field-group">
          <textarea class="field-input" id="transcriptInput" style="min-height:140px" placeholder="Paste meeting transcript here..."></textarea>
        </div>
      </div>

        <button class="btn-primary" id="submitBtn" style="margin-top:8px"><i class="ti ti-bolt" aria-hidden="true"></i>Process meeting</button>
      <p class="form-status" id="formStatus"></p>
    </div>
  `;

  const tabAudio = el.querySelector('#tabAudio');
  const tabTranscript = el.querySelector('#tabTranscript');
  const audioPane = el.querySelector('#audioPane');
  const transcriptPane = el.querySelector('#transcriptPane');

  tabAudio.addEventListener('click', () => {
    inputMode = 'audio';
    tabAudio.classList.add('active');
    tabTranscript.classList.remove('active');
    audioPane.style.display = 'block';
    transcriptPane.style.display = 'none';
  });

  tabTranscript.addEventListener('click', () => {
    inputMode = 'transcript';
    tabTranscript.classList.add('active');
    tabAudio.classList.remove('active');
    transcriptPane.style.display = 'block';
    audioPane.style.display = 'none';
  });

  const audioInput = el.querySelector('#audioInput');
  const dropzoneText = el.querySelector('#dropzoneText');

  el.querySelector('#browseBtn').addEventListener('click', () => audioInput.click());
  audioInput.addEventListener('change', () => {
    if (audioInput.files.length > 0) {
      selectedFile = audioInput.files[0];
      dropzoneText.textContent = `Selected: ${selectedFile.name}`;
    }
  });

  const dropzone = el.querySelector('#dropzone');
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
      dropzoneText.textContent = `Selected: ${selectedFile.name}`;
    }
  });

  el.querySelector('#submitBtn').addEventListener('click', () => handleSubmit(el));
};

const handleSubmit = async (el) => {
  const submitBtn = el.querySelector('#submitBtn');
  const formStatus = el.querySelector('#formStatus');
  const transcriptText = el.querySelector('#transcriptInput').value.trim();

  formStatus.classList.remove('error');
  formStatus.textContent = '';

  if (inputMode === 'audio' && !selectedFile) {
    formStatus.classList.add('error');
    formStatus.textContent = 'Choose an audio file first';
    return;
  }
  if (inputMode === 'transcript' && !transcriptText) {
    formStatus.classList.add('error');
    formStatus.textContent = 'Paste a transcript first';
    return;
  }

  const formData = new FormData();
  if (inputMode === 'audio') {
    formData.append('audioFile', selectedFile);
  } else {
    formData.append('transcriptText', transcriptText);
  }

  const title = el.querySelector('#mTitle').value.trim();
  const date = el.querySelector('#mDate').value;
  const participants = el.querySelector('#mParticipants').value.trim();
  if (title) formData.append('title', title);
  if (date) formData.append('date', date);
  if (participants) formData.append('participants', participants);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';
  formStatus.textContent = 'Transcribing and analyzing — this can take a moment for audio.';

  try {
    const res = await apiFetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.details || 'Processing failed');
    }

    navigate(`/app/meetings/${data.meetingId}`);

  } catch (err) {
    formStatus.classList.add('error');
    formStatus.textContent = err.message;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Process meeting';
  }
};