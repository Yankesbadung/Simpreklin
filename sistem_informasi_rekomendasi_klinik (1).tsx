import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  Building2, 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  ShieldAlert, 
  Layers, 
  Check, 
  Download, 
  Eye, 
  LogOut, 
  User, 
  ArrowRight,
  ClipboardList,
  Info,
  UserPlus,
  LogIn,
  Mail,
  Lock,
  LockKeyhole,
  ArrowLeft,
  KeyRound,
  FileCheck,
  QrCode,
  X
} from 'lucide-react';

// Inisialisasi Firebase sesuai konfigurasi lingkungan
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'siperklin-app-default';

// Jenis-jenis Rekomendasi Klinik
const PERMIT_TYPES = [
  { id: 'klinik-pratama-rj', name: 'Rekomendasi Operasional Klinik Pratama Rawat Jalan', duration: '14 Hari Kerja' },
  { id: 'klinik-pratama-ri', name: 'Rekomendasi Operasional Klinik Pratama Rawat Inap', duration: '21 Hari Kerja' },
  { id: 'klinik-utama-rj', name: 'Rekomendasi Operasional Klinik Utama Rawat Jalan', duration: '14 Hari Kerja' },
  { id: 'klinik-utama-ri', name: 'Rekomendasi Operasional Klinik Utama Rawat Inap', duration: '30 Hari Kerja' },
  { id: 'izin-mendirikan', name: 'Rekomendasi Mendirikan Klinik (Persetujuan Bangunan Gedung)', duration: '10 Hari Kerja' }
];

// Dokumen Persyaratan yang Harus Diunggah
const REQUIRED_DOCUMENTS = [
  { id: 'surat_permohonan', label: 'Surat Permohonan Registrasi (ditandatangani Pemilik Klinik)', required: true },
  { id: 'profil_klinik', label: 'Profil Klinik (Visi, Misi, Struktur Organisasi, Daftar Layanan)', required: true },
  { id: 'sip_pj', label: 'SIP Dokter Penanggung Jawab & STR yang masih berlaku', required: true },
  { id: 'sdm_medis', label: 'Selfasesment Tenaga Kesehatan', required: true },
  { id: 'imb_dan_lh', label: 'Sertifikat Standar & Dokumen Lingkungan (SPPL / UKL-UPL)', required: true },
  { id: 'pbg_slf', label: 'PBG dan SLF (wajib)', required: true },
  { id: 'dokumen_lainnya', label: 'Dokumen Pendukung Lainnya', required: true }
];

export default function App() {
  // Firebase Auth State
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active App Session State
  const [activeUser, setActiveUser] = useState(null); 
  const [userName, setUserName] = useState('');
  const [isRegisteringProfile, setIsRegisteringProfile] = useState(false);
  
  // Auth Form State
  const [authTab, setAuthTab] = useState('login'); // 'login', 'register', or 'forgot'
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Forgot Password Flow States
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetStep, setResetStep] = useState(1); 
  const [verificationCode, setVerificationCode] = useState('');
  const [userCodeInput, setUserCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Data State dari Firestore
  const [accounts, setAccounts] = useState([]); 
  const [registrations, setRegistrations] = useState([]); 
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [adminTab, setAdminTab] = useState('semua'); 
  
  // New Application Form State
  const [selectedPermit, setSelectedPermit] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({}); 
  
  // Modal / Detail States
  const [selectedReg, setSelectedReg] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  // Document Preview State (Fitur Utama Baru)
  const [previewFile, setPreviewFile] = useState(null); 
  
  // Notification / Feedback State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // RULE 3: Selalu jalankan autentikasi Firebase terlebih dahulu sebelum melakukan kueri apa pun
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error, mencoba masuk anonim:", err);
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.error("Gagal melakukan autentikasi anonim cadangan:", anonErr);
          showToast("Gagal mengaktifkan keamanan database secara aman.", "error");
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Sync state nama dengan activeUser profil saat ini
  useEffect(() => {
    if (activeUser) {
      setUserName(activeUser.name);
    }
  }, [activeUser]);

  // Memuat data Akun secara real-time (Setelah terautentikasi di Firebase)
  useEffect(() => {
    if (!firebaseUser) return;

    // RULE 1: Menggunakan struktur path yang diizinkan untuk data publik
    const accountsCol = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
    
    const unsubscribe = onSnapshot(accountsCol, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAccounts(list);
    }, (error) => {
      console.error("Gagal memuat daftar akun virtual:", error);
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  // Memuat data Pendaftaran secara real-time (Setelah terautentikasi di Firebase)
  useEffect(() => {
    if (!firebaseUser) return;

    // RULE 1: Menggunakan struktur path yang diizinkan untuk data publik
    const registrationsCol = collection(db, 'artifacts', appId, 'public', 'data', 'registrations');
    
    const unsubscribe = onSnapshot(registrationsCol, (snapshot) => {
      const docsList = [];
      snapshot.forEach((docSnap) => {
        docsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      // RULE 2: Lakukan pengurutan / sortir di memori Javascript (sisi klien)
      docsList.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      setRegistrations(docsList);
    }, (error) => {
      console.error("Firestore Listen Error: ", error);
      showToast("Gagal mensinkronisasikan berkas rekomendasi secara real-time.", "error");
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  // REGISTRASI AKUN (Simulasi Aman via Firestore Koleksi /accounts/ - Hanya untuk Peserta)
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      showToast("Harap isi semua kolom pendaftaran!", "error");
      return;
    }
    if (regPassword.length < 6) {
      showToast("Password minimal terdiri dari 6 karakter!", "error");
      return;
    }
    if (!firebaseUser) {
      showToast("Koneksi database belum siap. Tunggu beberapa detik.", "error");
      return;
    }

    setAuthLoading(true);
    try {
      const emailLower = regEmail.trim().toLowerCase();
      
      // Mencegah mendaftar menggunakan username admin khusus
      if (emailLower === 'yankesbadung') {
        showToast("Username tersebut dicadangkan untuk sistem keamanan!", "error");
        setAuthLoading(false);
        return;
      }

      // RULE 2: Filter/periksa kecocokan data di memori Javascript
      const existing = accounts.find(acc => acc.email.toLowerCase() === emailLower);
      if (existing) {
        showToast("Email tersebut sudah terdaftar di sistem!", "error");
        setAuthLoading(false);
        return;
      }

      // Simpan data akun baru ke Firestore (Seluruh pendaftaran publik otomatis menjadi 'peserta')
      const accountsCol = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
      const newAccount = {
        name: regName.trim(),
        email: emailLower,
        password: regPassword, 
        role: 'peserta', 
        createdAt: new Date().toISOString()
      };

      await addDoc(accountsCol, newAccount);

      // Masuk otomatis ke dalam aplikasi setelah registrasi sukses
      setActiveUser({
        name: newAccount.name,
        email: newAccount.email,
        role: newAccount.role
      });

      showToast("Akun Anda berhasil terdaftar!", "success");
      
      // Bersihkan formulir
      setRegName('');
      setRegEmail('');
      setRegPassword('');
    } catch (error) {
      console.error("Registration Error:", error);
      showToast("Gagal mendaftarkan akun baru. Silakan coba lagi.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // LOGIN AKUN (Dengan penambahan validasi akun khusus Admin)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast("Harap isi email/username dan password Anda!", "error");
      return;
    }
    if (!firebaseUser) {
      showToast("Koneksi database belum siap. Tunggu beberapa detik.", "error");
      return;
    }

    setAuthLoading(true);
    try {
      const inputIdentifier = loginEmail.trim().toLowerCase();
      
      // 1. Validasi khusus Akun Admin Utama
      if (inputIdentifier === 'yankesbadung' && loginPassword === 'Pelayanankesehatan1') {
        setActiveUser({
          name: 'Yankes Badung',
          email: 'yankesbadung',
          role: 'admin',
          id: 'admin-yankes-badung'
        });
        showToast("Berhasil masuk sebagai Administrator!", "success");
        setAuthLoading(false);
        return;
      }

      // 2. Login untuk Akun Peserta biasa
      const found = accounts.find(acc => acc.email.toLowerCase() === inputIdentifier && acc.password === loginPassword);
      
      if (found) {
        setActiveUser({
          name: found.name,
          email: found.email,
          role: found.role,
          id: found.id
        });
        showToast("Berhasil masuk ke aplikasi!", "success");
      } else {
        showToast("Email/Username atau password Anda salah!", "error");
      }
    } catch (error) {
      console.error("Login Error:", error);
      showToast("Gagal masuk ke sistem. Periksa koneksi internet Anda.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // MASUK CEPAT PESERTA DEMO (Uji Coba Mandiri)
  const handleQuickDemoPeserta = async () => {
    if (!firebaseUser) {
      showToast("Koneksi database belum siap. Tunggu beberapa detik.", "error");
      return;
    }
    setAuthLoading(true);
    
    const demoEmail = 'peserta.demo@siperklin.com';
    const demoPassword = 'demopeserta123';
    const demoName = 'Peserta Demo (Uji Coba)';
    
    try {
      // Cek apakah akun peserta demo sudah terdaftar di database virtual
      const found = accounts.find(acc => acc.email === demoEmail);
      if (!found) {
        const accountsCol = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
        await addDoc(accountsCol, {
          name: demoName,
          email: demoEmail,
          password: demoPassword,
          role: 'peserta',
          createdAt: new Date().toISOString()
        });
      }
      
      setActiveUser({
        name: demoName,
        email: demoEmail,
        role: 'peserta'
      });
      showToast("Berhasil masuk sebagai Peserta Demo!", "success");
    } catch (error) {
      console.error("Demo Login Error:", error);
      showToast("Gagal mengaktifkan akun demo.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setActiveUser(null);
    showToast("Anda telah keluar dari aplikasi.", "success");
    setActiveTab('dashboard');
  };

  // FUNGSI 1: MEMINTA KODE VERIFIKASI LUPA PASSWORD (SIMULASI)
  const handleForgotPasswordRequest = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast("Harap masukkan email Anda!", "error");
      return;
    }

    const emailLower = forgotEmail.trim().toLowerCase();

    // Mencegah perubahan mandiri akun admin utama yankesbadung
    if (emailLower === 'yankesbadung') {
      showToast("Password akun administrator utama tidak dapat direset mandiri demi keamanan!", "error");
      return;
    }

    // Periksa apakah email terdaftar dalam database virtual
    const found = accounts.find(acc => acc.email.toLowerCase() === emailLower);
    if (!found) {
      showToast("Alamat email tidak ditemukan di sistem!", "error");
      return;
    }

    // Buat kode verifikasi acak 6 digit
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(code);
    setResetStep(2);
    showToast(`Kode verifikasi berhasil dikirim!`, "success");
  };

  // FUNGSI 2: MEMVALIDASI KODE DAN MEMPERBARUI PASSWORD DI FIRESTORE
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!userCodeInput.trim() || !newPassword.trim()) {
      showToast("Harap lengkapi semua bidang input!", "error");
      return;
    }

    if (userCodeInput !== verificationCode) {
      showToast("Kode verifikasi yang Anda masukkan tidak cocok!", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password baru minimal harus terdiri dari 6 karakter!", "error");
      return;
    }

    setAuthLoading(true);
    try {
      const emailLower = forgotEmail.trim().toLowerCase();
      const account = accounts.find(acc => acc.email.toLowerCase() === emailLower);

      if (account) {
        // Update password baru ke Firestore
        const accountDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', account.id);
        await updateDoc(accountDocRef, { password: newPassword });
        
        showToast("Password Anda berhasil diperbarui! Silakan login kembali.", "success");
        
        // Reset state & kembalikan ke tab login
        setAuthTab('login');
        setForgotEmail('');
        setNewPassword('');
        setUserCodeInput('');
        setVerificationCode('');
        setResetStep(1);
      } else {
        showToast("Terjadi kesalahan sistem, akun tidak ditemukan.", "error");
      }
    } catch (err) {
      console.error("Gagal mereset sandi:", err);
      showToast("Gagal memperbarui password baru ke server.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // MEMPERBARUI NAMA PROFIL
  const handleUpdateProfileName = async (e) => {
    e.preventDefault();
    if (!activeUser || !userName.trim()) return;
    
    try {
      const account = accounts.find(acc => acc.email.toLowerCase() === activeUser.email.toLowerCase());
      if (account) {
        const accountDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', account.id);
        await updateDoc(accountDocRef, { name: userName.trim() });
      }
      setActiveUser(prev => ({ ...prev, name: userName.trim() }));
      setIsRegisteringProfile(false);
      showToast("Nama profil berhasil diperbarui", "success");
    } catch (err) {
      console.error("Gagal memperbarui nama ke database, mengubah lokal saja:", err);
      setActiveUser(prev => ({ ...prev, name: userName.trim() }));
      setIsRegisteringProfile(false);
      showToast("Nama profil diperbarui secara lokal", "success");
    }
  };

  // SIMULATOR UNGGAH BERKAS PDF & PENYIMPANAN LOCAL PREVIEW OBJECT
  const handleFileUpload = (docKey, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast("Hanya menerima berkas berformat PDF!", "error");
      return;
    }

    const fileInfo = {
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      dummyUrl: URL.createObjectURL(file) // Membuat Blob URL untuk melihat file lokal secara riil
    };

    setUploadedFiles(prev => ({
      ...prev,
      [docKey]: fileInfo
    }));

    showToast(`Dokumen "${file.name}" berhasil diunggah!`, 'success');
  };

  // FUNGSI MEMBUKA PRATINJAU FILE PDF LOKAL YANG BARU DIUNGHAH
  const handlePreviewLocalFile = (fileInfo, docLabel) => {
    if (!fileInfo || !fileInfo.dummyUrl) {
      showToast("Berkas pratinjau tidak ditemukan.", "error");
      return;
    }
    setPreviewFile({
      name: fileInfo.name,
      url: fileInfo.dummyUrl,
      isSimulated: false,
      docTypeLabel: docLabel
    });
  };

  // FUNGSI MEMBUKA PRATINJAU SIMULASI DOKUMEN RESMI (Untuk Berkas yang dimuat dari Firestore)
  const handlePreviewRemoteFile = (docItem, docKey, registration) => {
    const docType = REQUIRED_DOCUMENTS.find(d => d.id === docKey);
    const docLabel = docType ? docType.label : "Berkas Pendukung";

    setPreviewFile({
      name: docItem.name,
      url: null, // Kosong karena cross-session tidak membawa Blob URL lokal, sehingga menggunakan mesin simulator
      isSimulated: true,
      docTypeLabel: docLabel,
      clinicInfo: {
        clinicName: registration.clinicName,
        ownerName: registration.ownerName,
        clinicAddress: registration.clinicAddress,
        clinicPhone: registration.clinicPhone,
        permitTypeName: registration.permitTypeName,
        submittedAt: registration.submittedAt
      }
    });
  };

  const resetForm = () => {
    setSelectedPermit('');
    setClinicName('');
    setClinicAddress('');
    setClinicPhone('');
    setOwnerName('');
    setUploadedFiles({});
  };

  // KIRIM PENGAJUAN REKOMENDASI KLINIK BARU
  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    if (!selectedPermit || !clinicName || !clinicAddress || !clinicPhone || !ownerName) {
      showToast("Harap lengkapi semua data formulir utama klinik!", "error");
      return;
    }

    const missingDocs = REQUIRED_DOCUMENTS.filter(doc => doc.required && !uploadedFiles[doc.id]);
    if (missingDocs.length > 0) {
      showToast(`Harap unggah seluruh berkas PDF yang bersifat wajib!`, "error");
      return;
    }

    try {
      const newReg = {
        userId: activeUser.email,
        userName: activeUser.name,
        clinicName,
        clinicAddress,
        clinicPhone,
        ownerName,
        permitTypeId: selectedPermit,
        permitTypeName: PERMIT_TYPES.find(p => p.id === selectedPermit)?.name || '',
        status: 'Menunggu Verifikasi', 
        submittedAt: new Date().toISOString(),
        documents: Object.keys(uploadedFiles).reduce((acc, key) => {
          acc[key] = {
            name: uploadedFiles[key].name,
            size: uploadedFiles[key].size,
            uploadedAt: uploadedFiles[key].uploadedAt
          };
          return acc;
        }, {}),
        adminNote: '',
        verifiedAt: null
      };

      // RULE 1: Menggunakan struktur path yang diizinkan untuk data publik
      const registrationsCol = collection(db, 'artifacts', appId, 'public', 'data', 'registrations');
      await addDoc(registrationsCol, newReg);

      showToast("Pengajuan rekomendasi klinik Anda berhasil dikirim!", "success");
      resetForm();
      setActiveTab('riwayat');
    } catch (err) {
      console.error("Submit error:", err);
      showToast("Terjadi kesalahan sistem saat mengirim pengajuan", "error");
    }
  };

  // KEPUTUSAN VERIFIKASI ADMIN (SETUJU / TOLAK)
  const handleAdminDecision = async (status) => {
    if (!selectedReg) return;
    try {
      const regDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'registrations', selectedReg.id);
      await updateDoc(regDocRef, {
        status: status,
        adminNote: adminNote,
        verifiedAt: new Date().toISOString()
      });

      showToast(`Pengajuan berhasil ${status === 'Disetujui' ? 'Disetujui' : 'Ditolak'}!`, 'success');
      setShowDetailModal(false);
      setAdminNote('');
      setSelectedReg(null);
    } catch (err) {
      console.error(err);
      showToast("Gagal memperbarui status verifikasi", "error");
    }
  };

  // Penyaringan Sisi Klien (Kepatuhan terhadap RULE 2)
  const myRegistrations = registrations.filter(r => r.userId === activeUser?.email);
  const pendingRegistrations = registrations.filter(r => r.status === 'Menunggu Verifikasi');
  const approvedRegistrations = registrations.filter(r => r.status === 'Disetujui');
  const rejectedRegistrations = registrations.filter(r => r.status === 'Ditolak');

  const filteredAdminRegistrations = registrations.filter(r => {
    if (adminTab === 'semua') return true;
    if (adminTab === 'pending') return r.status === 'Menunggu Verifikasi';
    if (adminTab === 'disetujui') return r.status === 'Disetujui';
    if (adminTab === 'ditolak') return r.status === 'Ditolak';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl transition-all duration-300 border ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-rose-600" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Professional Licensing Header Portal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        {/* Main Header Brand */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-emerald-700 shadow-sm">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                SIPERKLIN <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">v2.1</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-500">Sistem Informasi Pendaftaran Rekomendasi Klinik Terpadu</p>
            </div>
          </div>

          {/* User Profile Summary */}
          {activeUser && (
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
              <div className="text-right">
                {isRegisteringProfile ? (
                  <form onSubmit={handleUpdateProfileName} className="flex gap-1 items-center">
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={(e) => setUserName(e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button type="submit" className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="font-semibold text-slate-800 text-sm">{activeUser.name}</span>
                    <button 
                      onClick={() => setIsRegisteringProfile(true)} 
                      className="text-emerald-600 hover:text-emerald-700 text-xs underline"
                    >
                      Ubah
                    </button>
                  </div>
                )}
                <span className="text-[10px] block font-mono text-slate-500">{activeUser.email}</span>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-100 to-teal-50 flex items-center justify-center border border-emerald-200 text-emerald-800 font-bold text-sm">
                {activeUser.name ? activeUser.name.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <button
                onClick={handleLogout}
                title="Keluar dari Aplikasi"
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* UN-AUTHENTICATED: LOGIN & REGISTER PAGES */}
      {!activeUser && (
        <div className="flex-grow flex items-center justify-center px-4 py-12 bg-gradient-to-tr from-slate-100 via-slate-50 to-emerald-50/20">
          <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-fadeIn">
            
            {/* Left Brand Column */}
            <div className="md:col-span-5 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="inline-flex p-3 bg-white/10 rounded-2xl">
                  <Building2 className="w-8 h-8 text-emerald-100" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight">SIPERKLIN BADUNG</h3>
                  <p className="text-emerald-100/80 text-xs mt-1 leading-relaxed">
                    Satu portal terpadu untuk pengurusan kelayakan administrasi rekomendasi operasional klinik tingkat Pratama maupun Utama.
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-emerald-200/60 font-mono mt-4">
                Bidang Pelayanan Kesehatan Dinas Kesehatan Kabupaten Badung
              </div>
            </div>

            {/* Right Forms Column */}
            <div className="md:col-span-7 p-8 flex flex-col justify-center">
              
              {/* Form Navigation Tabs */}
              <div className="flex border-b border-slate-100 mb-6 bg-slate-50 p-1 rounded-xl">
                <button
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    authTab === 'login' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LogIn className="w-4 h-4 text-emerald-600" />
                  Masuk Akun
                </button>
                <button
                  onClick={() => setAuthTab('register')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    authTab === 'register' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Pendaftaran Baru
                </button>
              </div>

              {/* 1. LOGIN FORM */}
              {authTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="text-left mb-4">
                    <h4 className="text-lg font-bold text-slate-900">Selamat Datang Kembali</h4>
                    <p className="text-xs text-slate-500">Masukkan email/username dan password untuk mengakses rekomendasi.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email / Username</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="contoh: yankesbadung atau dokter@email.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs outline-none"
                      />
                    </div>
                    <div className="text-right mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('forgot');
                          setResetStep(1);
                        }}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                      >
                        Lupa Password?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Masuk Sekarang
                      </>
                    )}
                  </button>

                  {/* Pembatas Visual */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-white px-3 text-slate-400 font-bold">Atau Uji Coba</span>
                    </div>
                  </div>

                  {/* Tombol Demo Cepat Peserta */}
                  <button
                    type="button"
                    onClick={handleQuickDemoPeserta}
                    disabled={authLoading}
                    className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4 text-emerald-600" />
                    Masuk sebagai Peserta Demo
                  </button>
                </form>
              )}

              {/* 2. REGISTRATION FORM (Strictly For Peserta/Pemohon Only) */}
              {authTab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="text-left mb-4">
                    <h4 className="text-lg font-bold text-slate-900">Buat Akun Rekomendasi Klinik</h4>
                    <p className="text-xs text-slate-500">Lengkapi formulir untuk memperoleh kredensial akses pelayanan klinik sebagai pemohon.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap Pemohon</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Contoh: Dr. Anita Medika"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Email Aktif</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="contoh: dokter@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password Baru</label>
                    <div className="relative">
                      <LockKeyhole className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Daftar Akun Baru
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 3. FORGOT PASSWORD FORM VIEW */}
              {authTab === 'forgot' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="text-left mb-2 flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setAuthTab('login')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                      title="Kembali ke halaman Login"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Atur Ulang Sandi</h4>
                      <p className="text-xs text-slate-500">Gunakan email Anda untuk memulihkan akun.</p>
                    </div>
                  </div>

                  {resetStep === 1 ? (
                    <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Email Terdaftar Pemohon</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            type="email"
                            required
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="Masukkan email pemohon Anda"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <KeyRound className="w-4 h-4" />
                        Kirim Kode Verifikasi (OTP)
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl text-xs text-emerald-800 space-y-1">
                        <p className="font-bold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          Email Berhasil Dikirim (Simulasi)
                        </p>
                        <p className="text-[11px] text-emerald-700">Kode verifikasi berikut telah dikirimkan ke email Anda:</p>
                        <div className="bg-white/80 border border-emerald-100 rounded-md py-1 px-3 w-max select-all font-mono font-extrabold text-sm tracking-wider text-emerald-800 mt-1">
                          {verificationCode}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Masukkan Kode Verifikasi</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={userCodeInput}
                          onChange={(e) => setUserCodeInput(e.target.value)}
                          placeholder="Ketik 6 digit PIN"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs text-center font-mono font-bold tracking-widest outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Buat Kata Sandi Baru</label>
                        <div className="relative">
                          <LockKeyhole className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-xs outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        {authLoading ? (
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Verifikasi & Atur Ulang Sandi
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA: CONFIGURED FOR AUTHENTICATED USER */}
      {activeUser && (
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* ROLE 1: PESERTA VIEW */}
          {activeUser.role === 'peserta' && (
            <div>
              {/* Participant Navigation Tabs */}
              <div className="flex border-b border-slate-200 mb-8 bg-white p-1 rounded-xl shadow-sm border">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'dashboard' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  Alur & Layanan Rekomendasi
                </button>
                <button
                  onClick={() => setActiveTab('pengajuan')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'pengajuan' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Formulir Pendaftaran
                </button>
                <button
                  onClick={() => setActiveTab('riwayat')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'riwayat' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Daftar Permohonan Anda
                  {myRegistrations.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold ml-1">
                      {myRegistrations.length}
                    </span>
                  )}
                </button>
              </div>

              {/* SUB-TAB 1: Dashboard Info Alur */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Hero Promotion */}
                  <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-1/3 -translate-y-1/3"></div>
                    <div className="relative z-10 max-w-2xl">
                      <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                        Layanan Publik Berbasis Online
                      </span>
                      <h2 className="text-2xl md:text-4xl font-extrabold mt-4 leading-tight">
                        Urus Rekomendasi Operasional Klinik Praktis secara Elektronik
                      </h2>
                      <p className="mt-2 text-slate-100 text-sm md:text-base leading-relaxed">
                        Sistem SIPERKLIN memfasilitasi Anda mengunggah dokumen administrasi, melakukan verifikasi cepat, dan melacak persetujuan kelayakan rekomendasi usaha klinik.
                      </p>
                      <button 
                        onClick={() => setActiveTab('pengajuan')}
                        className="mt-6 inline-flex items-center gap-2 bg-white text-emerald-900 px-5 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-emerald-50 transition-all hover:scale-105"
                      >
                        Daftar Sekarang <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Grid List of Permits Offered */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-600" />
                      Pilihan Menu Klasifikasi Rekomendasi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {PERMIT_TYPES.map((type) => (
                        <div key={type.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                          <div>
                            <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg w-max mb-3">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-base leading-snug">{type.name}</h4>
                            <p className="text-xs text-slate-500 mt-2">Rekomendasi komitmen pemenuhan standar nasional Indonesia.</p>
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-600">Estimasi Proses:</span>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">{type.duration}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Workflow Guidance Section */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      Tahapan Alur Pendaftaran & Verifikasi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                      <div className="relative flex flex-col items-center text-center">
                        <div className="bg-emerald-100 text-emerald-800 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3">1</div>
                        <h4 className="font-bold text-sm text-slate-900">Pilih Menu Rekomendasi</h4>
                        <p className="text-xs text-slate-500 mt-1">Pilih klasifikasi klinik Pratama/Utama Rawat Jalan/Inap.</p>
                      </div>
                      <div className="relative flex flex-col items-center text-center">
                        <div className="bg-emerald-100 text-emerald-800 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3">2</div>
                        <h4 className="font-bold text-sm text-slate-900">Lengkapi & Upload PDF</h4>
                        <p className="text-xs text-slate-500 mt-1">Isi formulir klinik lalu unggah berkas wajib PDF.</p>
                      </div>
                      <div className="relative flex flex-col items-center text-center">
                        <div className="bg-emerald-100 text-emerald-800 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3">3</div>
                        <h4 className="font-bold text-sm text-slate-900">Verifikasi Admin</h4>
                        <p className="text-xs text-slate-500 mt-1">Admin dinas akan memeriksa keabsahan isi & surat fisik PDF.</p>
                      </div>
                      <div className="relative flex flex-col items-center text-center">
                        <div className="bg-emerald-100 text-emerald-800 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3">4</div>
                        <h4 className="font-bold text-sm text-slate-900">Rekomendasi Terbit / Ditolak</h4>
                        <p className="text-xs text-slate-500 mt-1">Anda memperoleh dokumen persetujuan atau catatan perbaikan.</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* SUB-TAB 2: Application Registration Form */}
              {activeTab === 'pengajuan' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
                  <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-emerald-700" />
                      Formulir Permohonan Rekomendasi Baru Klinik
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">Harap isi data klinik secara lengkap dan unggah dokumen bukti PDF yang valid.</p>
                  </div>

                  <form onSubmit={handleSubmitApplication} className="p-6 md:p-8 space-y-8">
                    {/* Step 1: Jenis Rekomendasi */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">Langkah 1: Klasifikasi & Jenis Rekomendasi</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PERMIT_TYPES.map((type) => (
                          <label 
                            key={type.id} 
                            className={`border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-all ${
                              selectedPermit === type.id 
                                ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input 
                              type="radio" 
                              name="permitType" 
                              value={type.id}
                              checked={selectedPermit === type.id}
                              onChange={() => setSelectedPermit(type.id)}
                              className="mt-1 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <span className="font-bold text-slate-900 text-sm block">{type.name}</span>
                              <span className="text-xs text-slate-500 block mt-1">Durasi Kerja: {type.duration}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Formulir Identitas Klinik */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-4">Langkah 2: Data Administrasi Klinik</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Klinik <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            required
                            placeholder="Contoh: Klinik Pratama Sehat Utama"
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Badan Hukum / Pemilik <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            required
                            placeholder="Contoh: PT Medika Karya Sejahtera / Dr. Anita"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Alamat Lengkap Klinik <span className="text-red-500">*</span></label>
                          <textarea 
                            rows={3}
                            required
                            placeholder="Tuliskan nama jalan, kelurahan, kecamatan, kota, provinsi dan kode pos"
                            value={clinicAddress}
                            onChange={(e) => setClinicAddress(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm outline-none resize-none"
                          ></textarea>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor Telepon Klinik / PIC <span className="text-red-500">*</span></label>
                          <input 
                            type="tel" 
                            required
                            placeholder="Contoh: 021-xxxxxx atau 0812xxxxxxxx"
                            value={clinicPhone}
                            onChange={(e) => setClinicPhone(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 3: PDF Document Checklist and Upload */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Langkah 3: Unggah Dokumen Berkas Pendukung (PDF)</h4>
                      <p className="text-xs text-slate-500 mb-4">Pastikan format berkas berupa .PDF dengan ukuran maksimal 2MB per file.</p>
                      
                      <div className="space-y-4">
                        {REQUIRED_DOCUMENTS.map((docItem) => {
                          const file = uploadedFiles[docItem.id];
                          return (
                            <div key={docItem.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="max-w-md">
                                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                  {docItem.label}
                                  {docItem.required && <span className="text-red-500 text-xs bg-red-50 px-1.5 py-0.5 rounded">* Wajib</span>}
                                </span>
                                <span className="text-xs text-slate-500 block mt-0.5">Format dokumen resmi PDF</span>
                              </div>

                              <div>
                                {file ? (
                                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                                    <div className="p-1.5 bg-emerald-600 rounded text-white">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-xs font-bold text-emerald-900 max-w-[150px] truncate" title={file.name}>{file.name}</p>
                                      <p className="text-[10px] text-emerald-700">{file.size} - {file.uploadedAt}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handlePreviewLocalFile(file, docItem.label)}
                                        className="text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-2.5 rounded flex items-center gap-1 transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        Lihat
                                      </button>
                                      <label className="text-[11px] bg-white text-slate-600 border hover:bg-slate-50 py-1 px-2 rounded cursor-pointer font-bold flex items-center">
                                        Ganti
                                        <input 
                                          type="file" 
                                          accept="application/pdf"
                                          onChange={(e) => handleFileUpload(docItem.id, e)}
                                          className="hidden" 
                                        />
                                      </label>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer text-slate-600 hover:text-emerald-700 text-xs font-bold transition-all w-max shadow-sm">
                                    <UploadCloud className="w-4 h-4" />
                                    Unggah PDF
                                    <input 
                                      type="file" 
                                      accept="application/pdf"
                                      onChange={(e) => handleFileUpload(docItem.id, e)}
                                      className="hidden" 
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Submission Action Button */}
                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                      <button 
                        type="button" 
                        onClick={resetForm}
                        className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
                      >
                        Batal & Reset
                      </button>
                      <button 
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Kirim Pendaftaran
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SUB-TAB 3: Participant List of Applications */}
              {activeTab === 'riwayat' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-emerald-600" />
                      Riwayat Pengajuan Rekomendasi Klinik Anda
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">Total: {myRegistrations.length} Pengajuan</span>
                  </div>

                  {myRegistrations.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold text-slate-800">Belum Ada Pengajuan Rekomendasi</h4>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">Anda belum mendaftarkan rekomendasi operasional klinik apapun. Klik tombol pendaftaran untuk memulai pengajuan.</p>
                      <button 
                        onClick={() => setActiveTab('pengajuan')}
                        className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-colors"
                      >
                        Ajukan Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {myRegistrations.map((reg) => (
                        <div key={reg.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                          {/* Header card info */}
                          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                            <div>
                              <span className="text-xs text-emerald-800 bg-emerald-50 font-bold px-2.5 py-1 rounded-md">
                                {reg.permitTypeName}
                              </span>
                              <h4 className="text-lg font-bold text-slate-900 mt-2">{reg.clinicName}</h4>
                              <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                                <span>Pemilik: <strong className="text-slate-700">{reg.ownerName}</strong></span>
                                <span>•</span>
                                <span>Didaftarkan pada: <strong>{new Date(reg.submittedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</strong></span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {reg.status === 'Menunggu Verifikasi' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5" />
                                  Menunggu Verifikasi
                                </span>
                              )}
                              {reg.status === 'Disetujui' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle className="w-3.5 h-3.5 animate-bounce" />
                                  Rekomendasi Disetujui
                                </span>
                              )}
                              {reg.status === 'Ditolak' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Rekomendasi Ditolak
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Detail Uploaded Docs and Admin Notes */}
                          <div className="p-5 bg-slate-50 flex flex-col md:flex-row gap-6 justify-between items-start">
                            <div className="w-full">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kelengkapan Dokumen PDF:</p>
                              <div className="flex flex-wrap gap-2.5">
                                {Object.keys(reg.documents || {}).map((docKey) => (
                                  <div key={docKey} className="inline-flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg py-1 px-2.5 shadow-xs">
                                    <span className="text-[11px] text-slate-700 font-medium flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5 text-rose-500" />
                                      {reg.documents[docKey].name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewRemoteFile(reg.documents[docKey], docKey, reg)}
                                      className="text-[11px] text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 py-0.5 px-1.5 rounded font-extrabold flex items-center gap-0.5 border border-emerald-100 transition-colors"
                                    >
                                      <Eye className="w-3 h-3" />
                                      Lihat
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Admin Feedback Box */}
                            <div className="w-full md:max-w-md bg-white border border-slate-200 p-4 rounded-xl mt-4 md:mt-0 flex-shrink-0">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Catatan Verifikator Dinas</span>
                              {reg.adminNote ? (
                                <p className="text-xs text-slate-700 italic">"{reg.adminNote}"</p>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Belum ada tanggapan berkas.</p>
                              )}
                              {reg.verifiedAt && (
                                <span className="text-[10px] block text-slate-400 mt-2">Ditinjau pada: {new Date(reg.verifiedAt).toLocaleString('id-ID')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ROLE 2: ADMINISTRATOR VIEW */}
          {activeUser.role === 'admin' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Admin Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Pengajuan</span>
                    <span className="text-2xl font-extrabold text-slate-900 mt-1">{registrations.length}</span>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Perlu Verifikasi</span>
                    <span className="text-2xl font-extrabold text-amber-600 mt-1">{pendingRegistrations.length}</span>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Telah Disetujui</span>
                    <span className="text-2xl font-extrabold text-emerald-600 mt-1">{approvedRegistrations.length}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Berkas Ditolak</span>
                    <span className="text-2xl font-extrabold text-rose-600 mt-1">{rejectedRegistrations.length}</span>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                    <XCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Application List and Admin Filters */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Panel Verifikasi Pendaftaran Rekomendasi
                    </h3>
                    <p className="text-xs text-slate-500">Melihat permohonan, memvalidasi kelayakan berkas PDF, serta menyetujui/menolak rekomendasi.</p>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl self-end">
                    <button 
                      onClick={() => setAdminTab('semua')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adminTab === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua ({registrations.length})
                    </button>
                    <button 
                      onClick={() => setAdminTab('pending')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adminTab === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-amber-600'
                      }`}
                    >
                      Pending ({pendingRegistrations.length})
                    </button>
                    <button 
                      onClick={() => setAdminTab('disetujui')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adminTab === 'disetujui' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-600'
                      }`}
                    >
                      Disetujui ({approvedRegistrations.length})
                    </button>
                    <button 
                      onClick={() => setAdminTab('ditolak')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adminTab === 'ditolak' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-600'
                      }`}
                    >
                      Ditolak ({rejectedRegistrations.length})
                    </button>
                  </div>
                </div>

                {/* Verification Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-4 px-6">Informasi Klinik & Pemohon</th>
                        <th className="py-4 px-6">Jenis Rekomendasi</th>
                        <th className="py-4 px-6">Dokumen Unggahan</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredAdminRegistrations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 italic">
                            Tidak ditemukan data pengajuan dengan status terkait.
                          </td>
                        </tr>
                      ) : (
                        filteredAdminRegistrations.map((reg) => (
                          <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <div>
                                <span className="font-bold text-slate-900 block">{reg.clinicName}</span>
                                <span className="text-xs text-slate-500 block">{reg.ownerName} ({reg.clinicPhone})</span>
                                <span className="text-[10px] text-slate-400 block mt-1">Diajukan oleh: <strong className="text-slate-600">{reg.userName || 'Pemohon'}</strong></span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-xs bg-slate-100 text-slate-800 font-semibold px-2 py-1 rounded">
                                {reg.permitTypeName}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1.5">
                                {Object.keys(reg.documents || {}).map((key) => (
                                  <div key={key} className="flex items-center justify-between gap-2 max-w-[200px] border border-slate-150 rounded px-1.5 py-0.5 bg-white shadow-2xs">
                                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 truncate">
                                      <FileText className="w-3 h-3 text-rose-500 flex-shrink-0" />
                                      <span className="truncate max-w-[100px]" title={reg.documents[key].name}>{reg.documents[key].name}</span>
                                    </span>
                                    <button
                                      onClick={() => handlePreviewRemoteFile(reg.documents[key], key, reg)}
                                      className="text-[9px] bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold px-1 rounded transition-colors border border-emerald-100 flex items-center gap-0.5"
                                    >
                                      <Eye className="w-2.5 h-2.5" />
                                      Lihat
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              {reg.status === 'Menunggu Verifikasi' && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  Pending
                                </span>
                              )}
                              {reg.status === 'Disetujui' && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  Disetujui
                                </span>
                              )}
                              {reg.status === 'Ditolak' && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                  Ditolak
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => {
                                  setSelectedReg(reg);
                                  setAdminNote(reg.adminNote || '');
                                  setShowDetailModal(true);
                                }}
                                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Periksa Berkas
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      )}

      {/* VERIFICATION DETAIL MODAL (ADMIN CONTROL PANEL) */}
      {showDetailModal && selectedReg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-zoomIn max-h-[90vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center">
              <div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  ID: {selectedReg.id}
                </span>
                <h3 className="text-lg font-bold mt-1">Detail Dokumen & Evaluasi Klinik</h3>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-grow">
              
              {/* Klinik Info Section */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block">NAMA KLINIK:</span>
                  <span className="font-bold text-slate-800 text-sm block mt-0.5">{selectedReg.clinicName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">KLASIFIKASI LAYANAN:</span>
                  <span className="font-bold text-emerald-800 text-sm block mt-0.5">{selectedReg.permitTypeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">BADAN HUKUM / PEMILIK:</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedReg.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">KONTAK / TELEPON:</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedReg.clinicPhone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-semibold block">ALAMAT LENGKAP KLINIK:</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedReg.clinicAddress}</span>
                </div>
              </div>

              {/* Document Validation Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Daftar Dokumen & Verifikasi Berkas:</h4>
                <div className="space-y-2.5">
                  {Object.keys(selectedReg.documents || {}).map((docKey) => {
                    const docItem = selectedReg.documents[docKey];
                    return (
                      <div key={docKey} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-rose-50 rounded text-rose-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{docItem.name}</span>
                            <span className="text-[10px] text-slate-400 block">Ukuran: {docItem.size} | Diunggah: {docItem.uploadedAt}</span>
                          </div>
                        </div>

                        {/* Interactive View and Mock Download Buttons */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handlePreviewRemoteFile(docItem, docKey, selectedReg)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat Berkas
                          </button>
                          <a 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              showToast(`Mengunduh berkas "${docItem.name}" dalam format PDF...`, 'success');
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Unduh PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Unduh
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin Review Feedback Box */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Evaluasi & Catatan Khusus Dinas Kesehatan:
                </label>
                <textarea 
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Isi catatan jika rekomendasi ditolak (misal: 'Kurang berkas SIP Dokter PJ') atau catatan tambahan jika disetujui."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none resize-none"
                ></textarea>
              </div>

            </div>

            {/* Decision Footer Panel */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 block">STATUS SAAT INI:</span>
                <span className="text-xs font-bold text-slate-800 uppercase">{selectedReg.status}</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleAdminDecision('Ditolak')}
                  className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Tolak Berkas
                </button>
                <button
                  onClick={() => handleAdminDecision('Disetujui')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <CheckCircle className="w-4 h-4" />
                  Setujui & Terbitkan Rekomendasi
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL (INTERAKTIF & SIMULATIF) */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-zoomIn max-h-[92vh] flex flex-col">
            
            {/* Header Pratinjau */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm md:text-base leading-tight">Pratinjau Berkas Rekomendasi</h3>
                  <span className="text-xs text-slate-400 truncate max-w-[280px] md:max-w-md block mt-0.5">{previewFile.name}</span>
                </div>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer Panel */}
            <div className="p-6 overflow-y-auto flex-grow bg-slate-100 flex justify-center items-start min-h-[50vh]">
              {previewFile.isSimulated ? (
                /* SIMULASI DOKUMEN RESMI PEMERINTAHAN (FALLBACK SINKRONISASI DATABASE) */
                <div className="w-full max-w-2xl bg-white shadow-lg p-8 md:p-12 rounded-lg border border-slate-300 relative font-serif text-slate-900 leading-relaxed text-sm select-none">
                  
                  {/* Watermark Simulasi */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-12 select-none">
                    <span className="text-5xl md:text-6xl font-sans font-extrabold tracking-widest text-emerald-950 text-center uppercase">
                      SIPERKLIN BADUNG<br/>DOKUMEN SIMULASI
                    </span>
                  </div>

                  {/* Kop Surat Resmi */}
                  <div className="text-center border-b-4 border-double border-slate-900 pb-5 mb-6 relative">
                    <div className="absolute top-0 left-0 w-16 h-16 bg-slate-100 rounded-full border border-slate-300 flex items-center justify-center font-sans text-slate-400 text-xs font-bold">
                      LOGO DINAS
                    </div>
                    <h4 className="font-sans font-extrabold text-base tracking-wider uppercase">Pemerintah Kabupaten Badung</h4>
                    <h3 className="font-sans font-black text-lg tracking-wider uppercase mt-1">Dinas Kesehatan Kabupaten Badung</h3>
                    <p className="font-sans text-xs text-slate-500 mt-1 not-italic">
                      Pusat Pemerintahan Mangupraja Mandala Jl. Raya Sempidi, Badung, Bali<br/>
                      Telepon: (0361) 900xxxx | Email: dinkes@badungkab.go.id
                    </p>
                  </div>

                  {/* Judul Dokumen */}
                  <div className="text-center mb-6">
                    <h5 className="font-bold uppercase underline tracking-wide text-sm">{previewFile.docTypeLabel}</h5>
                    <span className="text-xs font-sans tracking-widest block text-slate-600 mt-1">
                      Nomor Dokumen: 440/SIPERKLIN-SIM/{Math.floor(1000 + Math.random() * 9000)}/2026
                    </span>
                  </div>

                  {/* Isi Dokumen Berdasarkan Tipe Dokumen */}
                  <div className="space-y-4 text-justify leading-relaxed">
                    <p>Menerangkan dengan ini, data teknis klinik yang terekam secara sah dalam pangkalan data Sistem Informasi Rekomendasi Klinik (SIPERKLIN) Kabupaten Badung:</p>
                    
                    <table className="w-full font-sans text-xs border border-slate-200 divide-y divide-slate-100 rounded-lg overflow-hidden my-4">
                      <tbody>
                        <tr className="bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-500 w-1/3">Nama Klinik</td>
                          <td className="py-2.5 px-4 font-extrabold text-slate-900">{previewFile.clinicInfo?.clinicName}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-slate-500">Klasifikasi Layanan</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-800">{previewFile.clinicInfo?.permitTypeName}</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-500">Pemilik / Penanggung Jawab</td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{previewFile.clinicInfo?.ownerName}</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4 font-bold text-slate-500">Alamat Klinik</td>
                          <td className="py-2.5 px-4 text-slate-800">{previewFile.clinicInfo?.clinicAddress}</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-500">Waktu Pengajuan Elektronik</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">
                            {previewFile.clinicInfo?.submittedAt ? new Date(previewFile.clinicInfo.submittedAt).toLocaleString('id-ID') : '-'} WITA
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Deskripsi Detil Berdasarkan Berkas */}
                    {previewFile.docTypeLabel.includes("Permohonan") && (
                      <p>Bahwa pihak pemohon mengajukan berkas resmi yang menyatakan komitmen penuh untuk menyelenggarakan fasilitas pelayanan kesehatan yang berpedoman pada standar operasional nasional, menjaga mutu keselamatan pasien, dan mematuhi seluruh perundang-undangan di Kabupaten Badung.</p>
                    )}
                    {previewFile.docTypeLabel.includes("Profil") && (
                      <p>Dokumen ini memuat visi, misi, bagan struktur organisasi kepemimpinan klinik, daftar layanan medis yang diselenggarakan, jam operasional, serta ketersediaan sarana dan prasarana penunjang kenyamanan sirkulasi pasien.</p>
                    )}
                    {previewFile.docTypeLabel.includes("SIP") && (
                      <p>Berkas ini melampirkan salinan sah Surat Izin Praktik (SIP) dan Surat Tanda Registrasi (STR) tenaga medis Dokter Penanggung Jawab Klinik yang masih berlaku, memastikan bahwa seluruh tindakan medis diawasi oleh tenaga ahli berlisensi resmi.</p>
                    )}
                    {previewFile.docTypeLabel.includes("Selfasesment") && (
                      <p>Melampirkan rincian penilaian mandiri (Self-Assessment) sarana, peralatan kesehatan, instrumen sterilisasi, persediaan obat-obatan gawat darurat, serta daftar lengkap tenaga keperawatan dan penunjang klinis.</p>
                    )}
                    {previewFile.docTypeLabel.includes("Lingkungan") && (
                      <p>Membuktikan kepemilikan dokumen pengelolaan lingkungan hidup terdaftar (SPPL / UKL-UPL) serta nota kerja sama (MoU) pembuangan dan pemusnahan limbah medis B3 bersama pihak ketiga yang berwenang.</p>
                    )}
                    {previewFile.docTypeLabel.includes("PBG") && (
                      <p>Membuktikan keabsahan konstruksi bangunan melalui Persetujuan Bangunan Gedung (PBG) serta Sertifikat Laik Fungsi (SLF) yang memverifikasi kekuatan struktural dan pemenuhan keselamatan bangunan gedung klinik.</p>
                    )}

                    <p>Demikian lembar simulasi penelusuran data dokumen ini diterbitkan sebagai bukti otentik kelengkapan administrasi digital dalam portal satu pintu.</p>
                  </div>

                  {/* Tanda Tangan Elektronik QR-Code */}
                  <div className="mt-12 flex justify-between items-end border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-700">
                        <QrCode className="w-16 h-16" />
                      </div>
                      <div className="text-[10px] font-sans text-slate-500 leading-tight max-w-[180px]">
                        <p className="font-bold uppercase text-slate-700">Verifikasi QR-Code</p>
                        <p className="mt-1">Pindai kode QR di atas untuk memverifikasi keaslian tanda tangan digital dokumen ini melalui jaringan portal resmi.</p>
                      </div>
                    </div>

                    <div className="text-center font-sans text-xs w-48">
                      <p className="text-slate-500">MANGUPURA, {previewFile.clinicInfo?.submittedAt ? new Date(previewFile.clinicInfo.submittedAt).toLocaleDateString('id-ID', {year: 'numeric', month: 'long', day: 'numeric'}).toUpperCase() : '-'}</p>
                      <p className="font-bold text-slate-800 uppercase mt-1">Dinas Kesehatan Kabupaten Badung</p>
                      <div className="my-3 h-12 flex items-center justify-center text-emerald-600">
                        <span className="border-2 border-dashed border-emerald-400 rounded-lg px-3 py-1 font-mono font-bold text-[10px] tracking-wider uppercase rotate-[-3deg] shadow-xs bg-emerald-50/50">
                          TANDA TANGAN ELEKTRONIK
                        </span>
                      </div>
                      <p className="font-extrabold text-slate-900 underline">PANEL VERIFIKASI DIGITAL</p>
                      <p className="text-[10px] text-slate-400">NIP. 19820512 200801 1 003</p>
                    </div>
                  </div>

                </div>
              ) : (
                /* ACTUAL EMBEDDED PDF VIEWER (Untuk Berkas PDF Lokal Baru) */
                <div className="w-full h-[75vh] bg-white rounded-xl shadow-lg overflow-hidden border border-slate-300 flex flex-col">
                  <div className="bg-emerald-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-emerald-950 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Berkas PDF Asli Terunggah dari Perangkat Anda
                    </span>
                    <span className="font-mono text-slate-500">{previewFile.name}</span>
                  </div>
                  <iframe 
                    src={previewFile.url} 
                    title="Pratinjau Dokumen Asli"
                    className="w-full flex-grow border-0" 
                  />
                </div>
              )}
            </div>

            {/* Footer Penutup */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-950 text-white font-bold text-xs shadow-sm transition-colors"
              >
                Tutup Pratinjau
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer System Info */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 SIPERKLIN. Dinas Penanaman Modal & Pelayanan Terpadu Satu Pintu (DPMPTSP) Kerja Sama Dinas Kesehatan.</p>
          <p className="mt-1 font-mono text-[10px]">App ID: {appId}</p>
        </div>
      </footer>

    </div>
  );
}