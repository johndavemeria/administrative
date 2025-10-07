// Supabase Configuration
const SUPABASE_URL = 'https://imhfolbfxfsojtpwoddf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltaGZvbGJmeGZzb2p0cHdvZGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDg0NzksImV4cCI6MjA3MTg4NDQ3OX0.M-SxwxLrSqu2HR3p05G_Aq3zVEHwKx6vWYZSNTuPQw0';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentModule = 'dashboard';
let reservations = [];
let documents = [];
let allDocuments = [];
let legalDocuments = [];
let allLegalDocuments = [];
let visitors = [];
let allVisitors = [];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    showDashboard();
    setupEventListeners();
    setTimeout(() => {
        showNotification('Welcome to Urban Looms Administrative System!', 'success');
    }, 500);
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Facilities form submit
    const facilitiesForm = document.getElementById('facilitiesForm');
    if (facilitiesForm) {
        facilitiesForm.addEventListener('submit', handleCreateReservation);
    }

    // Documents form submit
    const documentsForm = document.getElementById('documentsForm');
    if (documentsForm) {
        documentsForm.addEventListener('submit', handleCreateDocument);
    }

    // Legal form submit
    const legalForm = document.getElementById('legalForm');
    if (legalForm) {
        legalForm.addEventListener('submit', handleCreateLegalDocument);
    }

    // Edit legal form submit
    const editLegalForm = document.getElementById('editLegalForm');
    if (editLegalForm) {
        editLegalForm.addEventListener('submit', handleUpdateLegalDocument);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="block"]');
            if (openModal) {
                openModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            } else if (currentModule !== 'dashboard') {
                showDashboard();
            }
        }
    });

    // Set minimum date to today for date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => {
        input.setAttribute('min', today);
    });
}

// ==================== NAVIGATION ====================
function showModule(module) {
    document.getElementById('dashboard').style.display = 'none';
    document.querySelectorAll('.main-content').forEach(content => {
        content.style.display = 'none';
    });
    
    document.getElementById(module).style.display = 'block';
    currentModule = module;
    updatePageTitle(module);

    if (module === 'facilities') {
        loadReservations();
    } else if (module === 'documents') {
        loadDocuments();
    } else if (module === 'legal') {
        loadLegalDocuments();
    } else if (module === 'visitors') {
        loadVisitors();
    }
}

function showDashboard() {
    document.querySelectorAll('.main-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById('dashboard').style.display = 'block';
    currentModule = 'dashboard';
    updatePageTitle('dashboard');
    updateDashboardStats();
}

function updatePageTitle(module) {
    const titles = {
        'dashboard': 'Administrative Dashboard',
        'facilities': 'Facilities Reservation',
        'documents': 'Document Management',
        'legal': 'Legal Management',
        'visitors': 'Visitor Management'
    };
    document.title = `Urban Looms - ${titles[module]}`;
}

// ==================== MODAL FUNCTIONS ====================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Reset form if exists
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ==================== FACILITIES RESERVATION CRUD ====================

// CREATE - Add new reservation
async function handleCreateReservation(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
    const formData = new FormData(e.target);
    const reservationData = {
        facility_name: formData.get('facility'),
        reserved_by: formData.get('reservedBy'),
        reservation_date: formData.get('date'),
        reservation_time: formData.get('time'),
        duration: parseInt(formData.get('duration')),
        purpose: formData.get('purpose') || '',
        status: 'pending'
    };

    try {
        const { data, error } = await supabase
            .from('facilities_reservations')
            .insert([reservationData])
            .select();

        if (error) throw error;

        showNotification('Reservation created successfully!', 'success');
        closeModal('facilitiesModal');
        e.target.reset();
        loadReservations();
        
    } catch (error) {
        console.error('Error creating reservation:', error);
        showNotification('Error creating reservation: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Reservation';
    }
}

// READ - Load all reservations
async function loadReservations() {
    const loading = document.getElementById('facilities-loading');
    const tbody = document.getElementById('facilities-tbody');
    
    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
        const { data, error } = await supabase
            .from('facilities_reservations')
            .select('*')
            .order('reservation_date', { ascending: false })
            .order('reservation_time', { ascending: false });

        if (error) throw error;

        reservations = data || [];
        
        if (reservations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--gray);">No reservations found. Create your first reservation!</td></tr>';
        } else {
            reservations.forEach(reservation => {
                renderReservationRow(reservation);
            });
        }
        
        updateDashboardStats();
        
    } catch (error) {
        console.error('Error loading reservations:', error);
        showNotification('Error loading reservations: ' + error.message, 'error');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--danger);">Error loading data. Please refresh the page.</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}

// Render a single reservation row
function renderReservationRow(reservation) {
    const tbody = document.getElementById('facilities-tbody');
    const row = document.createElement('tr');
    
    const dateTime = formatDateTime(reservation.reservation_date, reservation.reservation_time);
    const statusClass = `status-${reservation.status}`;
    const statusText = reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1);
    
    row.innerHTML = `
        <td>${reservation.facility_name}</td>
        <td>${reservation.reserved_by}</td>
        <td>${dateTime}</td>
        <td>${reservation.duration} ${reservation.duration === 1 ? 'hour' : 'hours'}</td>
        <td>${reservation.purpose || '-'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
            <button class="btn btn-secondary" onclick="alert('Edit functionality coming soon')">Edit</button>
            <button class="btn btn-danger" onclick="deleteReservation('${reservation.id}')">Delete</button>
        </td>
    `;
    
    tbody.appendChild(row);
}

// DELETE - Remove reservation
async function deleteReservation(id) {
    if (!confirm('Are you sure you want to delete this reservation?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('facilities_reservations')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Reservation deleted successfully!', 'success');
        loadReservations();
        
    } catch (error) {
        console.error('Error deleting reservation:', error);
        showNotification('Error deleting reservation: ' + error.message, 'error');
    }
}

// ==================== DOCUMENT MANAGEMENT CRUD ====================

// CREATE - Add new document
async function handleCreateDocument(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitDocBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    
    const formData = new FormData(e.target);
    
    // Process tags
    const tagsString = formData.get('tags');
    const tagsArray = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const documentData = {
        document_name: formData.get('documentName'),
        document_type: formData.get('documentType'),
        category: formData.get('category'),
        uploaded_by: formData.get('uploadedBy'),
        upload_date: formData.get('uploadDate'),
        file_size: formData.get('fileSize') ? parseInt(formData.get('fileSize')) : null,
        file_url: formData.get('fileUrl') || null,
        description: formData.get('description') || '',
        tags: tagsArray,
        status: 'active',
        version: '1.0'
    };

    try {
        const { data, error } = await supabase
            .from('documents')
            .insert([documentData])
            .select();

        if (error) throw error;

        showNotification('Document uploaded successfully!', 'success');
        closeModal('documentsModal');
        e.target.reset();
        loadDocuments();
        
    } catch (error) {
        console.error('Error creating document:', error);
        showNotification('Error uploading document: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Document';
    }
}

// READ - Load all documents
async function loadDocuments() {
    const loading = document.getElementById('documents-loading');
    const tbody = document.getElementById('documents-tbody');
    
    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .order('upload_date', { ascending: false });

        if (error) throw error;

        allDocuments = data || [];
        documents = [...allDocuments];
        
        if (documents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--gray);">No documents found. Upload your first document!</td></tr>';
        } else {
            documents.forEach(doc => {
                renderDocumentRow(doc);
            });
        }
        
        updateDashboardStats();
        
    } catch (error) {
        console.error('Error loading documents:', error);
        showNotification('Error loading documents: ' + error.message, 'error');
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--danger);">Error loading data. Please refresh the page.</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}

// Render a single document row
function renderDocumentRow(doc) {
    const tbody = document.getElementById('documents-tbody');
    const row = document.createElement('tr');
    
    const statusClass = `status-${doc.status}`;
    const statusText = doc.status.charAt(0).toUpperCase() + doc.status.slice(1);
    const fileSize = doc.file_size ? formatFileSize(doc.file_size) : '-';
    const uploadDate = formatDate(doc.upload_date);
    
    row.innerHTML = `
        <td>${doc.document_name}</td>
        <td>${doc.document_type}</td>
        <td>${doc.category}</td>
        <td>${doc.uploaded_by}</td>
        <td>${uploadDate}</td>
        <td class="file-size">${fileSize}</td>
        <td>${doc.version}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
            ${doc.file_url ? `<button class="btn btn-info" onclick="window.open('${doc.file_url}', '_blank')">View</button>` : ''}
            <button class="btn btn-secondary" onclick="alert('Edit functionality coming soon')">Edit</button>
            <button class="btn btn-danger" onclick="deleteDocument('${doc.id}')">Delete</button>
        </td>
    `;
    
    tbody.appendChild(row);
}

// DELETE - Remove document
async function deleteDocument(id) {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Document deleted successfully!', 'success');
        loadDocuments();
        
    } catch (error) {
        console.error('Error deleting document:', error);
        showNotification('Error deleting document: ' + error.message, 'error');
    }
}

// FILTER - Filter documents
function filterDocuments() {
    const categoryFilter = document.getElementById('category-filter').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value.toLowerCase();
    const searchTerm = document.getElementById('search-documents').value.toLowerCase();
    
    documents = allDocuments.filter(doc => {
        const matchesCategory = !categoryFilter || doc.category.toLowerCase() === categoryFilter;
        const matchesStatus = !statusFilter || doc.status.toLowerCase() === statusFilter;
        const matchesSearch = !searchTerm || 
            doc.document_name.toLowerCase().includes(searchTerm) ||
            doc.uploaded_by.toLowerCase().includes(searchTerm) ||
            doc.description.toLowerCase().includes(searchTerm) ||
            (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        
        return matchesCategory && matchesStatus && matchesSearch;
    });
    
    // Re-render table
    const tbody = document.getElementById('documents-tbody');
    tbody.innerHTML = '';
    
    if (documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--gray);">No documents match your filters.</td></tr>';
    } else {
        documents.forEach(doc => {
            renderDocumentRow(doc);
        });
    }
}

// ==================== LEGAL MANAGEMENT CRUD ====================

// CREATE - Add new legal document
async function handleCreateLegalDocument(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitLegalBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
    const formData = new FormData(e.target);
    
    // Process party names
    const partyNamesString = formData.get('partyNames');
    const partyNamesArray = partyNamesString ? partyNamesString.split(',').map(p => p.trim()).filter(p => p) : [];
    
    // Process tags
    const tagsString = formData.get('tags');
    const tagsArray = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const legalData = {
        document_name: formData.get('documentName'),
        document_type: formData.get('documentType'),
        contract_type: formData.get('contractType') || null,
        party_names: partyNamesArray,
        effective_date: formData.get('effectiveDate'),
        expiration_date: formData.get('expirationDate') || null,
        renewal_date: formData.get('renewalDate') || null,
        contract_value: formData.get('contractValue') ? parseFloat(formData.get('contractValue')) : null,
        status: 'draft',
        attorney_assigned: formData.get('attorneyAssigned') || null,
        department: formData.get('department'),
        description: '',
        terms_summary: formData.get('termsSummary') || null,
        compliance_notes: formData.get('complianceNotes') || null,
        file_url: formData.get('fileUrl') || null,
        file_size: formData.get('fileSize') ? parseInt(formData.get('fileSize')) : null,
        tags: tagsArray,
        created_by: formData.get('createdBy')
    };

    try {
        const { data, error } = await supabase
            .from('legal_documents')
            .insert([legalData])
            .select();

        if (error) throw error;

        showNotification('Legal document created successfully!', 'success');
        closeModal('legalModal');
        e.target.reset();
        loadLegalDocuments();
        
    } catch (error) {
        console.error('Error creating legal document:', error);
        showNotification('Error creating legal document: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Legal Document';
    }
}

// READ - Load all legal documents
async function loadLegalDocuments() {
    const loading = document.getElementById('legal-loading');
    const tbody = document.getElementById('legal-tbody');
    
    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
        const { data, error } = await supabase
            .from('legal_documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allLegalDocuments = data || [];
        legalDocuments = [...allLegalDocuments];
        
        if (legalDocuments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--gray);">No legal documents found. Create your first legal document!</td></tr>';
        } else {
            legalDocuments.forEach(doc => {
                renderLegalDocumentRow(doc);
            });
        }
        
        updateDashboardStats();
        
    } catch (error) {
        console.error('Error loading legal documents:', error);
        showNotification('Error loading legal documents: ' + error.message, 'error');
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--danger);">Error loading data. Please refresh the page.</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}

// Render a single legal document row
function renderLegalDocumentRow(doc) {
    const tbody = document.getElementById('legal-tbody');
    const row = document.createElement('tr');
    
    const statusClass = `status-${doc.status}`;
    const statusText = doc.status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const effectiveDate = formatDate(doc.effective_date);
    const expirationDate = doc.expiration_date ? formatDate(doc.expiration_date) : 'N/A';
    const contractValue = doc.contract_value ? `$${doc.contract_value.toLocaleString()}` : 'N/A';
    const parties = doc.party_names ? doc.party_names.join(', ') : 'N/A';
    
    row.innerHTML = `
        <td>${doc.document_name}</td>
        <td>${doc.document_type}</td>
        <td>${parties}</td>
        <td>${effectiveDate}</td>
        <td>${expirationDate}</td>
        <td>${contractValue}</td>
        <td>${doc.attorney_assigned || 'Unassigned'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
            ${doc.file_url ? `<button class="btn btn-info" onclick="window.open('${doc.file_url}', '_blank')">View</button>` : ''}
            <button class="btn btn-secondary" onclick="openEditLegalModal('${doc.id}')">Edit</button>
            <button class="btn btn-danger" onclick="deleteLegalDocument('${doc.id}')">Delete</button>
        </td>
    `;
    
    tbody.appendChild(row);
}

// UPDATE - Edit legal document
function openEditLegalModal(id) {
    const doc = legalDocuments.find(d => d.id === id);
    if (!doc) return;

    document.getElementById('edit-legal-id').value = doc.id;
    document.getElementById('edit-legal-name').value = doc.document_name;
    document.getElementById('edit-legal-type').value = doc.document_type;
    document.getElementById('edit-legal-contract-type').value = doc.contract_type || '';
    document.getElementById('edit-legal-department').value = doc.department;
    document.getElementById('edit-legal-parties').value = doc.party_names ? doc.party_names.join(', ') : '';
    document.getElementById('edit-legal-effective').value = doc.effective_date;
    document.getElementById('edit-legal-expiration').value = doc.expiration_date || '';
    document.getElementById('edit-legal-renewal').value = doc.renewal_date || '';
    document.getElementById('edit-legal-value').value = doc.contract_value || '';
    document.getElementById('edit-legal-attorney').value = doc.attorney_assigned || '';
    document.getElementById('edit-legal-terms').value = doc.terms_summary || '';
    document.getElementById('edit-legal-compliance').value = doc.compliance_notes || '';
    document.getElementById('edit-legal-url').value = doc.file_url || '';
    document.getElementById('edit-legal-size').value = doc.file_size || '';
    document.getElementById('edit-legal-tags').value = doc.tags ? doc.tags.join(', ') : '';
    document.getElementById('edit-legal-creator').value = doc.created_by;
    document.getElementById('edit-legal-status').value = doc.status;

    openModal('editLegalModal');
}

async function handleUpdateLegalDocument(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    
    const formData = new FormData(e.target);
    const id = formData.get('id');
    
    // Process party names
    const partyNamesString = formData.get('partyNames');
    const partyNamesArray = partyNamesString ? partyNamesString.split(',').map(p => p.trim()).filter(p => p) : [];
    
    // Process tags
    const tagsString = formData.get('tags');
    const tagsArray = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const updateData = {
        document_name: formData.get('documentName'),
        document_type: formData.get('documentType'),
        contract_type: formData.get('contractType') || null,
        party_names: partyNamesArray,
        effective_date: formData.get('effectiveDate'),
        expiration_date: formData.get('expirationDate') || null,
        renewal_date: formData.get('renewalDate') || null,
        contract_value: formData.get('contractValue') ? parseFloat(formData.get('contractValue')) : null,
        status: formData.get('status'),
        attorney_assigned: formData.get('attorneyAssigned') || null,
        department: formData.get('department'),
        terms_summary: formData.get('termsSummary') || null,
        compliance_notes: formData.get('complianceNotes') || null,
        file_url: formData.get('fileUrl') || null,
        file_size: formData.get('fileSize') ? parseInt(formData.get('fileSize')) : null,
        tags: tagsArray,
        created_by: formData.get('createdBy'),
        updated_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('legal_documents')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;

        showNotification('Legal document updated successfully!', 'success');
        closeModal('editLegalModal');
        loadLegalDocuments();
        
    } catch (error) {
        console.error('Error updating legal document:', error);
        showNotification('Error updating legal document: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Legal Document';
    }
}

// DELETE - Remove legal document
async function deleteLegalDocument(id) {
    if (!confirm('Are you sure you want to delete this legal document?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('legal_documents')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Legal document deleted successfully!', 'success');
        loadLegalDocuments();
        
    } catch (error) {
        console.error('Error deleting legal document:', error);
        showNotification('Error deleting legal document: ' + error.message, 'error');
    }
}

// FILTER - Filter legal documents
function filterLegalDocuments() {
    const typeFilter = document.getElementById('legal-type-filter').value.toLowerCase();
    const statusFilter = document.getElementById('legal-status-filter').value.toLowerCase();
    const searchTerm = document.getElementById('search-legal').value.toLowerCase();
    
    legalDocuments = allLegalDocuments.filter(doc => {
        const matchesType = !typeFilter || doc.document_type.toLowerCase() === typeFilter;
        const matchesStatus = !statusFilter || doc.status.toLowerCase() === statusFilter;
        const matchesSearch = !searchTerm || 
            doc.document_name.toLowerCase().includes(searchTerm) ||
            doc.created_by.toLowerCase().includes(searchTerm) ||
            (doc.attorney_assigned && doc.attorney_assigned.toLowerCase().includes(searchTerm)) ||
            (doc.party_names && doc.party_names.some(p => p.toLowerCase().includes(searchTerm)));
        
        return matchesType && matchesStatus && matchesSearch;
    });
    
    // Re-render table
    const tbody = document.getElementById('legal-tbody');
    tbody.innerHTML = '';
    
    if (legalDocuments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--gray);">No legal documents match your filters.</td></tr>';
    } else {
        legalDocuments.forEach(doc => {
            renderLegalDocumentRow(doc);
        });
    }
}

// ==================== VISITOR MANAGEMENT CRUD ====================

// CREATE - Add new visitor
async function handleCreateVisitor(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitVisitorBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
    const formData = new FormData(e.target);
    
    // Process access areas
    const accessAreasString = formData.get('accessAreas');
    const accessAreasArray = accessAreasString ? accessAreasString.split(',').map(a => a.trim()).filter(a => a) : [];
    
    // Process accompanying visitors
    const accompanyingString = formData.get('accompanyingVisitors');
    const accompanyingArray = accompanyingString ? accompanyingString.split(',').map(v => v.trim()).filter(v => v) : [];
    
    const visitorData = {
        visitor_name: formData.get('visitorName'),
        visitor_email: formData.get('visitorEmail') || null,
        visitor_phone: formData.get('visitorPhone') || null,
        visitor_company: formData.get('visitorCompany') || null,
        visitor_id_type: formData.get('visitorIdType') || null,
        visitor_id_number: formData.get('visitorIdNumber') || null,
        visit_purpose: formData.get('visitPurpose'),
        host_name: formData.get('hostName'),
        host_department: formData.get('hostDepartment') || null,
        host_contact: formData.get('hostContact') || null,
        visit_date: formData.get('visitDate'),
        expected_arrival_time: formData.get('expectedArrivalTime'),
        expected_departure_time: formData.get('expectedDepartureTime') || null,
        meeting_location: formData.get('meetingLocation') || null,
        access_areas: accessAreasArray,
        escort_required: formData.get('escortRequired') === 'on',
        escort_name: formData.get('escortName') || null,
        status: 'scheduled',
        visit_type: formData.get('visitType'),
        security_clearance: formData.get('securityClearance') || null,
        special_requirements: formData.get('specialRequirements') || null,
        vehicle_plate_number: formData.get('vehiclePlateNumber') || null,
        number_of_visitors: parseInt(formData.get('numberOfVisitors')) || 1,
        accompanying_visitors: accompanyingArray,
        notes: formData.get('notes') || null,
        created_by: formData.get('createdBy')
    };

    try {
        const { data, error } = await supabase
            .from('visitors')
            .insert([visitorData])
            .select();

        if (error) throw error;

        showNotification('Visitor registered successfully!', 'success');
        closeModal('visitorsModal');
        e.target.reset();
        loadVisitors();
        
    } catch (error) {
        console.error('Error creating visitor:', error);
        showNotification('Error registering visitor: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register Visitor';
    }
}

// READ - Load all visitors
async function loadVisitors() {
    const loading = document.getElementById('visitors-loading');
    const tbody = document.getElementById('visitors-tbody');
    
    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
        const { data, error } = await supabase
            .from('visitors')
            .select('*')
            .order('visit_date', { ascending: false })
            .order('expected_arrival_time', { ascending: false });

        if (error) throw error;

        allVisitors = data || [];
        visitors = [...allVisitors];
        
        if (visitors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: var(--gray);">No visitors found. Register your first visitor!</td></tr>';
        } else {
            visitors.forEach(visitor => {
                renderVisitorRow(visitor);
            });
        }
        
        updateDashboardStats();
        
    } catch (error) {
        console.error('Error loading visitors:', error);
        showNotification('Error loading visitors: ' + error.message, 'error');
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: var(--danger);">Error loading data. Please refresh the page.</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}

// Render a single visitor row
function renderVisitorRow(visitor) {
    const tbody = document.getElementById('visitors-tbody');
    const row = document.createElement('tr');
    
    const statusClass = `status-${visitor.status}`;
    const statusText = visitor.status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const visitDate = formatDate(visitor.visit_date);
    const arrivalTime = formatTime(visitor.expected_arrival_time);
    const visitType = visitor.visit_type.charAt(0).toUpperCase() + visitor.visit_type.slice(1);
    
    row.innerHTML = `
        <td>${visitor.visitor_name}</td>
        <td>${visitor.visitor_company || '-'}</td>
        <td>${visitor.host_name}</td>
        <td>${visitDate} ${arrivalTime}</td>
        <td>${visitType}</td>
        <td>${visitor.visit_purpose}</td>
        <td>${visitor.meeting_location || '-'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${visitor.badge_number || '-'}</td>
        <td>
            ${visitor.status === 'scheduled' ? `<button class="btn btn-secondary" onclick="checkInVisitor('${visitor.id}')">Check In</button>` : ''}
            ${visitor.status === 'checked_in' ? `<button class="btn btn-info" onclick="checkOutVisitor('${visitor.id}')">Check Out</button>` : ''}
            <button class="btn btn-secondary" onclick="openEditVisitorModal('${visitor.id}')">Edit</button>
            <button class="btn btn-danger" onclick="deleteVisitor('${visitor.id}')">Delete</button>
        </td>
    `;
    
    tbody.appendChild(row);
}

// Check In Visitor
async function checkInVisitor(id) {
    const badgeNumber = prompt('Enter Badge Number:');
    if (!badgeNumber) return;

    try {
        const { error } = await supabase
            .from('visitors')
            .update({
                status: 'checked_in',
                actual_arrival_time: new Date().toISOString(),
                badge_number: badgeNumber,
                checked_in_by: 'Security'
            })
            .eq('id', id);

        if (error) throw error;

        showNotification('Visitor checked in successfully!', 'success');
        loadVisitors();
        
    } catch (error) {
        console.error('Error checking in visitor:', error);
        showNotification('Error checking in visitor: ' + error.message, 'error');
    }
}

// Check Out Visitor
async function checkOutVisitor(id) {
    if (!confirm('Check out this visitor?')) return;

    try {
        const { error } = await supabase
            .from('visitors')
            .update({
                status: 'checked_out',
                actual_departure_time: new Date().toISOString(),
                checked_out_by: 'Security'
            })
            .eq('id', id);

        if (error) throw error;

        showNotification('Visitor checked out successfully!', 'success');
        loadVisitors();
        
    } catch (error) {
        console.error('Error checking out visitor:', error);
        showNotification('Error checking out visitor: ' + error.message, 'error');
    }
}

// UPDATE - Edit visitor
function openEditVisitorModal(id) {
    const visitor = visitors.find(v => v.id === id);
    if (!visitor) return;

    document.getElementById('edit-visitor-id').value = visitor.id;
    document.getElementById('edit-visitor-name').value = visitor.visitor_name;
    document.getElementById('edit-visitor-email').value = visitor.visitor_email || '';
    document.getElementById('edit-visitor-phone').value = visitor.visitor_phone || '';
    document.getElementById('edit-visitor-company').value = visitor.visitor_company || '';
    document.getElementById('edit-visitor-purpose').value = visitor.visit_purpose;
    document.getElementById('edit-host-name').value = visitor.host_name;
    document.getElementById('edit-host-department').value = visitor.host_department || '';
    document.getElementById('edit-visit-date').value = visitor.visit_date;
    document.getElementById('edit-arrival-time').value = visitor.expected_arrival_time;
    document.getElementById('edit-departure-time').value = visitor.expected_departure_time || '';
    document.getElementById('edit-meeting-location').value = visitor.meeting_location || '';
    document.getElementById('edit-visit-type').value = visitor.visit_type;
    document.getElementById('edit-visitor-status').value = visitor.status;

    openModal('editVisitorsModal');
}

async function handleUpdateVisitor(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    
    const formData = new FormData(e.target);
    const id = formData.get('id');
    
    const updateData = {
        visitor_name: formData.get('visitorName'),
        visitor_email: formData.get('visitorEmail') || null,
        visitor_phone: formData.get('visitorPhone') || null,
        visitor_company: formData.get('visitorCompany') || null,
        visit_purpose: formData.get('visitPurpose'),
        host_name: formData.get('hostName'),
        host_department: formData.get('hostDepartment') || null,
        visit_date: formData.get('visitDate'),
        expected_arrival_time: formData.get('expectedArrivalTime'),
        expected_departure_time: formData.get('expectedDepartureTime') || null,
        meeting_location: formData.get('meetingLocation') || null,
        visit_type: formData.get('visitType'),
        status: formData.get('status'),
        updated_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('visitors')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;

        showNotification('Visitor updated successfully!', 'success');
        closeModal('editVisitorsModal');
        loadVisitors();
        
    } catch (error) {
        console.error('Error updating visitor:', error);
        showNotification('Error updating visitor: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Visitor';
    }
}

// DELETE - Remove visitor
async function deleteVisitor(id) {
    if (!confirm('Are you sure you want to delete this visitor record?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('visitors')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Visitor deleted successfully!', 'success');
        loadVisitors();
        
    } catch (error) {
        console.error('Error deleting visitor:', error);
        showNotification('Error deleting visitor: ' + error.message, 'error');
    }
}

// FILTER - Filter visitors
function filterVisitors() {
    const statusFilter = document.getElementById('visitor-status-filter').value.toLowerCase();
    const typeFilter = document.getElementById('visitor-type-filter').value.toLowerCase();
    const searchTerm = document.getElementById('search-visitors').value.toLowerCase();
    
    visitors = allVisitors.filter(visitor => {
        const matchesStatus = !statusFilter || visitor.status.toLowerCase() === statusFilter;
        const matchesType = !typeFilter || visitor.visit_type.toLowerCase() === typeFilter;
        const matchesSearch = !searchTerm || 
            visitor.visitor_name.toLowerCase().includes(searchTerm) ||
            visitor.host_name.toLowerCase().includes(searchTerm) ||
            (visitor.visitor_company && visitor.visitor_company.toLowerCase().includes(searchTerm)) ||
            visitor.visit_purpose.toLowerCase().includes(searchTerm);
        
        return matchesStatus && matchesType && matchesSearch;
    });
    
    // Re-render table
    const tbody = document.getElementById('visitors-tbody');
    tbody.innerHTML = '';
    
    if (visitors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: var(--gray);">No visitors match your filters.</td></tr>';
    } else {
        visitors.forEach(visitor => {
            renderVisitorRow(visitor);
        });
    }
}

// ==================== DASHBOARD STATS ====================
async function updateDashboardStats() {
    try {
        // Facilities stats
        const { data: facilityData, error: facilityError } = await supabase
            .from('facilities_reservations')
            .select('status');

        if (!facilityError && facilityData) {
            const activeCount = facilityData.filter(r => r.status === 'active').length;
            const pendingCount = facilityData.filter(r => r.status === 'pending').length;

            document.getElementById('active-bookings').textContent = activeCount;
            document.getElementById('pending-bookings').textContent = pendingCount;
        }

        // Documents stats
        const { data: docData, error: docError } = await supabase
            .from('documents')
            .select('category');

        if (!docError && docData) {
            const totalDocs = docData.length;
            const uniqueCategories = [...new Set(docData.map(d => d.category))].length;

            document.getElementById('total-documents').textContent = totalDocs;
            document.getElementById('total-categories').textContent = uniqueCategories;
        }

        // Legal documents stats
        const { data: legalData, error: legalError } = await supabase
            .from('legal_documents')
            .select('status, expiration_date');

        if (!legalError && legalData) {
            const activeContracts = legalData.filter(d => d.status === 'active').length;
            
            // Calculate expiring soon (within 30 days)
            const today = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(today.getDate() + 30);
            
            const expiringSoon = legalData.filter(d => {
                if (!d.expiration_date) return false;
                const expDate = new Date(d.expiration_date);
                return expDate >= today && expDate <= thirtyDaysFromNow;
            }).length;
            
            document.getElementById('active-contracts').textContent = activeContracts;
            document.getElementById('expiring-soon').textContent = expiringSoon;
        }

        // Visitor stats
        const { data: visitorData, error: visitorError } = await supabase
            .from('visitors')
            .select('status, visit_date');

        if (!visitorError && visitorData) {
            const today = new Date().toISOString().split('T')[0];
            const todayVisitors = visitorData.filter(v => v.visit_date === today).length;
            const scheduledVisitors = visitorData.filter(v => v.status === 'scheduled').length;
            
            // Update dashboard stats (find the visitor card stats)
            const visitorStatNumbers = document.querySelectorAll('#visitors .stat-number');
            if (visitorStatNumbers.length >= 2) {
                visitorStatNumbers[0].textContent = todayVisitors;
                visitorStatNumbers[1].textContent = scheduledVisitors;
            }
        }
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Format date and time for display
function formatDateTime(date, time) {
    const d = new Date(date + 'T' + time);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return d.toLocaleString('en-US', options);
}

// Format date only
function formatDate(date) {
    const d = new Date(date);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    };
    return d.toLocaleString('en-US', options);
}

// Format time only
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Format file size
function formatFileSize(sizeInKB) {
    if (sizeInKB < 1024) {
        return `${sizeInKB} KB`;
    } else if (sizeInKB < 1024 * 1024) {
        return `${(sizeInKB / 1024).toFixed(2)} MB`;
    } else {
        return `${(sizeInKB / (1024 * 1024)).toFixed(2)} GB`;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// ==================== REAL-TIME UPDATES ====================
// Subscribe to real-time changes for facilities
const reservationsSubscription = supabase
    .channel('facilities_reservations_changes')
    .on('postgres_changes', 
        { 
            event: '*', 
            schema: 'public', 
            table: 'facilities_reservations' 
        }, 
        (payload) => {
            console.log('Facilities change detected:', payload);
            if (currentModule === 'facilities') {
                loadReservations();
            } else {
                updateDashboardStats();
            }
        }
    )
    .subscribe();

// Subscribe to real-time changes for documents
const documentsSubscription = supabase
    .channel('documents_changes')
    .on('postgres_changes', 
        { 
            event: '*', 
            schema: 'public', 
            table: 'documents' 
        }, 
        (payload) => {
            console.log('Documents change detected:', payload);
            if (currentModule === 'documents') {
                loadDocuments();
            } else {
                updateDashboardStats();
            }
        }
    )
    .subscribe();

// Subscribe to real-time changes for legal documents
const legalDocumentsSubscription = supabase
    .channel('legal_documents_changes')
    .on('postgres_changes', 
        { 
            event: '*', 
            schema: 'public', 
            table: 'legal_documents' 
        }, 
        (payload) => {
            console.log('Legal documents change detected:', payload);
            if (currentModule === 'legal') {
                loadLegalDocuments();
            } else {
                updateDashboardStats();
            }
        }
    )
    .subscribe();

// Subscribe to real-time changes for visitors
const visitorsSubscription = supabase
    .channel('visitors_changes')
    .on('postgres_changes', 
        { 
            event: '*', 
            schema: 'public', 
            table: 'visitors' 
        }, 
        (payload) => {
            console.log('Visitors change detected:', payload);
            if (currentModule === 'visitors') {
                loadVisitors();
            } else {
                updateDashboardStats();
            }
        }
    )
    .subscribe();