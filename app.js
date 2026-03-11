document.addEventListener('DOMContentLoaded', () => {
    console.log("Uygulama başlatıldı. Veri işlemleri için server.js kullanılacak.");

    // --- Eleman Seçimleri ---
    const notesGrid = document.getElementById('notesGrid');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const noteModal = document.getElementById('noteModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const noteForm = document.getElementById('noteForm');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const noteCountSpan = document.getElementById('noteCount');
    const fileInput = document.getElementById('noteFile');
    const filePreview = document.getElementById('filePreview');
    const navItems = document.querySelectorAll('.nav-item');

    // Auth Elements
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const sidebar = document.querySelector('.sidebar');

    // --- State Yönetimi ---
    let notes = JSON.parse(localStorage.getItem('lectureNotes')) || [];
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    let currentFilter = 'all'; // all, favorites, recent
    let currentSearch = '';

    // --- Başlangıç Kontrolü ---
    checkUserAuth();

    // --- Event Listeners ---
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }

    addNoteBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    noteModal.addEventListener('click', (e) => {
        if (e.target === noteModal) closeModal();
    });

    noteForm.addEventListener('submit', handleFormSubmit);
    fileInput.addEventListener('change', handleFileSelect);

    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        renderNotes();
    });

    sortSelect.addEventListener('change', renderNotes);

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            currentFilter = item.dataset.filter;
            renderNotes();
        });
    });

    // --- Auth Fonksiyonları ---
    function checkUserAuth() {
        if (!currentUser) {
            if (authModal) authModal.classList.add('active');
        } else {
            initApp();
        }
    }

    async function handleAuthSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('userName').value.trim();
        const surname = document.getElementById('userSurname').value.trim();
        const email = document.getElementById('userEmail').value.trim();

        if (name && surname && email) {
            try {
                const response = await fetch('http://localhost:3000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, surname, email })
                });

                const data = await response.json();

                if (data.success) {
                    // Sunucudan gelen kullanıcı verisini kullan
                    currentUser = {
                        ...data.user,
                        fullName: `${data.user.name} ${data.user.surname}`
                    };
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));

                    authModal.classList.remove('active');
                    initApp();
                } else {
                    alert('Kayıt başarısız: ' + data.message);
                }
            } catch (err) {
                console.error("Kayıt hatası:", err);
                alert("Sunucuya bağlanırken bir hata oluştu. Lütfen server.js'in çalıştığından emin olun.");
            }
        }
    }

    function initApp() {
        renderUserProfile();
        renderNotes();
        updateNoteCount();
    }

    function renderUserProfile() {
        const existingProfile = document.querySelector('.user-profile');
        if (existingProfile) existingProfile.remove();

        if (!currentUser) return;

        const profileHtml = `
            <div class="user-profile">
                <div class="user-avatar">
                    ${currentUser.name.charAt(0).toUpperCase()}${currentUser.surname.charAt(0).toUpperCase()}
                </div>
                <div class="user-info">
                    <span class="user-name">${currentUser.fullName}</span>
                    <span class="user-email" style="font-size: 0.7rem;">${currentUser.email}</span>
                </div>
                 <button onclick="window.logout()" title="Çıkış Yap" style="background:none; border:none; cursor:pointer; margin-left:auto; color: var(--text-muted);">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        `;
        sidebar.insertAdjacentHTML('beforeend', profileHtml);
    }

    window.logout = function () {
        if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
            localStorage.removeItem('currentUser');
            location.reload();
        }
    };

    // --- Not Fonksiyonları ---

    function openModal() {
        if (!currentUser) {
            checkUserAuth();
            return;
        }
        noteModal.classList.add('active');
        filePreview.innerHTML = '';
        noteForm.reset();
        // Default visibility Private olsun
        try {
            document.querySelector('input[name="noteVisibility"][value="private"]').checked = true;
        } catch (e) { console.error("Visibility inputs not found"); }
    }

    function closeModal() {
        noteModal.classList.remove('active');
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const title = document.getElementById('noteTitle').value;
        const course = document.getElementById('noteCourse').value;
        const tags = document.getElementById('noteTags').value;
        const content = document.getElementById('noteContent').value;

        let visibility = 'private';
        try {
            visibility = document.querySelector('input[name="noteVisibility"]:checked').value;
        } catch (e) {
            console.warn("Visibility selection not found, defaulting to private");
        }

        let imageUrl = null;
        if (fileInput.files && fileInput.files[0]) {
            imageUrl = await readFileAsDataURL(fileInput.files[0]);
        }

        const newNote = {
            id: Date.now().toString(),
            title,
            course,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
            content,
            imageUrl,
            date: new Date().toISOString(),
            isFavorite: false,
            owner: currentUser ? currentUser.email : 'unknown',
            visibility: visibility
        };

        notes.unshift(newNote);
        saveNotes();
        renderNotes();
        updateNoteCount();
        closeModal();
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                filePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            filePreview.innerHTML = '';
        }
    }

    function deleteNote(id) {
        const note = notes.find(n => n.id === id);
        if (note && note.owner && currentUser && note.owner !== currentUser.email) {
            alert("Bu notu silme yetkiniz yok!");
            return;
        }

        if (confirm('Bu notu silmek istediğinize emin misiniz?')) {
            notes = notes.filter(note => note.id !== id);
            saveNotes();
            renderNotes();
            updateNoteCount();
        }
    }

    function toggleFavorite(id) {
        const noteIndex = notes.findIndex(note => note.id === id);
        if (noteIndex !== -1) {
            notes[noteIndex].isFavorite = !notes[noteIndex].isFavorite;
            saveNotes();
            renderNotes();
        }
    }

    function saveNotes() {
        localStorage.setItem('lectureNotes', JSON.stringify(notes));
    }

    function updateNoteCount() {
        noteCountSpan.innerText = `${getFilteredAndSortedNotes().length} not`;
    }

    function getFilteredAndSortedNotes() {
        if (!currentUser) return [];

        let filtered = notes.filter(note => {
            const isOwner = note.owner === currentUser.email;
            const isPublic = note.visibility === 'public';
            const hasNoOwner = !note.owner;

            return isOwner || isPublic || hasNoOwner;
        });

        if (currentFilter === 'favorites') {
            filtered = filtered.filter(n => n.isFavorite);
        }

        if (currentSearch) {
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(currentSearch) ||
                note.course.toLowerCase().includes(currentSearch) ||
                note.content.toLowerCase().includes(currentSearch) ||
                note.tags.some(tag => tag.toLowerCase().includes(currentSearch))
            );
        }

        const sortValue = sortSelect.value;
        filtered.sort((a, b) => {
            if (sortValue === 'date-desc') {
                return new Date(b.date) - new Date(a.date);
            } else if (sortValue === 'date-asc') {
                return new Date(a.date) - new Date(b.date);
            } else if (sortValue === 'title-asc') {
                return a.title.localeCompare(b.title);
            }
            return 0;
        });

        if (currentFilter === 'recent') {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        return filtered;
    }

    function renderNotes() {
        const displayNotes = getFilteredAndSortedNotes();
        notesGrid.innerHTML = '';

        if (displayNotes.length === 0) {
            notesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-folder-open"></i>
                    <p>Gösterilecek not bulunamadı.</p>
                </div>
            `;
            return;
        }

        displayNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';

            const dateStr = new Date(note.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

            let imageHtml = '';
            if (note.imageUrl) {
                imageHtml = `<img src="${note.imageUrl}" class="note-image" alt="Not görseli">`;
            }

            let tagsHtml = note.tags.map(tag => `<span class="tag">#${tag}</span>`).join('');

            const favClass = note.isFavorite ? 'fa-solid' : 'fa-regular';
            const favColor = note.isFavorite ? 'color: var(--accent-color);' : '';

            let visibilityIcon = '';
            if (note.visibility === 'private') {
                visibilityIcon = '<i class="fa-solid fa-lock" title="Gizli Not (Sadece Ben)" style="color:var(--text-muted); font-size: 0.8rem;"></i>';
            } else if (note.visibility === 'public') {
                visibilityIcon = '<i class="fa-solid fa-globe" title="Herkese Açık" style="color:var(--text-muted); font-size: 0.8rem;"></i>';
            }

            const isMine = (currentUser && note.owner === currentUser.email) || !note.owner;
            const deleteBtn = isMine ?
                `<button class="action-btn delete-btn" onclick="window.deleteNote('${note.id}')" title="Sil">
                    <i class="fa-regular fa-trash-can"></i>
                </button>` : '';

            card.innerHTML = `
                <div class="note-header">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="note-course">${note.course}</span>
                        ${visibilityIcon}
                    </div>
                    <div class="note-actions">
                        <button class="action-btn favorite-btn" onclick="window.toggleFavorite('${note.id}')" title="Favorilere Ekle">
                            <i class="${favClass} fa-heart" style="${favColor}"></i>
                        </button>
                        ${deleteBtn}
                    </div>
                </div>
                ${imageHtml}
                <h3 class="note-title">${note.title}</h3>
                <p class="note-preview">${note.content}</p>
                <div class="note-tags">
                    ${tagsHtml}
                </div>
                <div class="note-date">
                    ${!isMine && note.owner ? `<span style="float:left; font-style:italic; font-size:0.7rem; margin-right:5px;">${note.owner}</span>` : ''}
                    ${dateStr}
                </div>
            `;

            notesGrid.appendChild(card);
        });
    }

    window.deleteNote = deleteNote;
    window.toggleFavorite = toggleFavorite;
    window.logout = logout;
});
