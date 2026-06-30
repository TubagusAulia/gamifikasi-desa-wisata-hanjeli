const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { generatePesertaPassword, generateQuizPassword } = require('./utils/password');

const kelompokData = [
  'Wisata SMK Telkom',
  'TPLM Tel-U',
  'KKN ITB',
  'Turis 30/6/2026',
];

const pesertaData = [
  { nama: 'Admin 1', email: 'admin1@admin', role: 'admin', kelompok_id: null, password: 'admin' },
  { nama: 'Admin 2', email: 'admin2@admin', role: 'admin', kelompok_id: null, password: 'admin' },
  { nama: 'Pekerja 1', email: 'pekerja1@pekerja', role: 'worker', kelompok_id: null, password: 'pekerja' },
  { nama: 'Pekerja 2', email: 'pekerja2@pekerja', role: 'worker', kelompok_id: null, password: 'pekerja' },
  { nama: 'Apel', email: 'apel@peserta', role: 'peserta', kelompok_id: 0, password: 'peserta' },
  { nama: 'Mangga', email: 'mangga@peserta', role: 'peserta', kelompok_id: 0, password: 'peserta' },
  { nama: 'Nanas', email: 'nanas@peserta', role: 'peserta', kelompok_id: 0, password: 'peserta' },
  { nama: 'Nadia Rahma', email: 'nadia2@peserta', role: 'peserta', kelompok_id: 0, password: 'peserta' },
  { nama: 'Bayu Setiawan', email: 'bayu2@peserta', role: 'peserta', kelompok_id: 0, password: 'peserta' },
  { nama: 'Espresso', email: 'espresso@peserta', role: 'peserta', kelompok_id: 1, password: 'peserta' },
  { nama: 'Mocca', email: 'mocca@peserta', role: 'peserta', kelompok_id: 1, password: 'peserta' },
  { nama: 'Matcha', email: 'matcha@peserta', role: 'peserta', kelompok_id: 1, password: 'peserta' },
  { nama: 'Indah Permata', email: 'indah2@peserta', role: 'peserta', kelompok_id: 1, password: 'peserta' },
  { nama: 'Joko Prasetyo', email: 'joko2@peserta', role: 'peserta', kelompok_id: 1, password: 'peserta' },
  { nama: 'Kartika Dewi', email: 'kartika@peserta', role: 'peserta', kelompok_id: 2, password: 'peserta' },
  { nama: 'Lukman Hakim', email: 'lukman@peserta', role: 'peserta', kelompok_id: 2, password: 'peserta' },
  { nama: 'Maya Anggraini', email: 'maya@peserta', role: 'peserta', kelompok_id: 2, password: 'peserta' },
  { nama: 'Nanda Pratama', email: 'nanda@peserta', role: 'peserta', kelompok_id: 2, password: 'peserta' },
  { nama: 'Olivia Sari', email: 'olivia@peserta', role: 'peserta', kelompok_id: 2, password: 'peserta' },
  { nama: 'Putra Ramadhan', email: 'putra@peserta', role: 'peserta', kelompok_id: 3, password: 'peserta' },
  { nama: 'Qori Handayani', email: 'qori@peserta', role: 'peserta', kelompok_id: 3, password: 'peserta' },
  { nama: 'Rina Susanti', email: 'rina@peserta', role: 'peserta', kelompok_id: 3, password: 'peserta' },
  { nama: 'Surya Darma', email: 'surya@peserta', role: 'peserta', kelompok_id: 3, password: 'peserta' },
  { nama: 'Tina Marlina', email: 'tina@peserta', role: 'peserta', kelompok_id: 3, password: 'peserta' },
];

const posData = [
  { nama: 'Rumah Hanjeli', latitude: -6.973455, longitude: 107.635876, radius: 100, deskripsi: 'Pusat koordinasi dan edukasi hanjeli' },
  { nama: 'Sawah Hanjeli', latitude: -6.978330, longitude: 107.630174, radius: 100, deskripsi: 'Area tanam dan panen hanjeli' },
  { nama: 'Tumbuk & Nampih', latitude: -6.969282, longitude: 107.628157, radius: 100, deskripsi: 'Proses pascapanen tradisional' },
  { nama: 'Panggang Rengginang', latitude: -6.972959, longitude: 107.629641, radius: 100, deskripsi: 'Produksi rengginang dan dodol' },
];

const soalData = [
      // POS 1: Rumah Hanjeli
      { opsi_a: 'Abah Asep Hidayat Mustopa', opsi_b: 'Bapak Hely Sugriwa', opsi_c: 'Rahmat Yusuf', jawaban: 'A', poin: 1 },
      { opsi_a: 'Lebih rendah, yaitu hanya sekitar 4%', opsi_b: 'Hampir dua kali lipat, mencapai 14,5% - 15,8%', opsi_c: 'Sama persis, yaitu sebesar 8,8%', jawaban: 'B', poin: 1 },
      { opsi_a: 'Mantan pekerja migran (PMI) dan buruh penambang batu', opsi_b: 'Nelayan pesisir pantai selatan Sukabumi', opsi_c: 'Petani kelapa sawit skala industri', jawaban: 'A', poin: 1 },
      { opsi_a: 'Kp. Cekdam Waluran RT 10/02, Desa Waluran Mandiri', opsi_b: 'Kp. Pasir Piring RT 05/01, Kecamatan Ciracap', opsi_c: 'Jl. Ciletuh Raya KM 12, Pelabuhanratu', jawaban: 'A', poin: 1 },
      { opsi_a: 'Mengandung indeks glikemik tinggi dan sodium pekat', opsi_b: 'Memiliki indeks glikemik rendah dan tinggi kalsium', opsi_c: 'Mengandung senyawa gluten aktif pembakar lemak', jawaban: 'B', poin: 1 },

      // POS 2: Sawah Hanjeli
      { opsi_a: 'Sekitar 2 hingga 3 bulan saja', opsi_b: 'Sekitar 5 hingga 6 bulan lamanya', opsi_c: 'Lebih dari 12 bulan penuh', jawaban: 'B', poin: 1 },
      { opsi_a: 'Mengoptimalkan lahan dan menutup waktu tunggu panen yang lama', opsi_b: 'Mempercepat masa panen hanjeli menjadi hanya 1 bulan', opsi_c: 'Memenuhi syarat wajib sertifikasi ekspor internasional', jawaban: 'A', poin: 1 },
      { opsi_a: 'Etem (ani-ani)', opsi_b: 'Lisung kayu', opsi_c: 'Rakel bambu', jawaban: 'A', poin: 1 },
      { opsi_a: 'Direndam di dalam air panas bersuhu 50°C selama 24 - 48 jam', opsi_b: 'Dijemur di bawah terik matahari ekstrem selama 7 hari', opsi_c: 'Direndam cairan alkohol berkadar murni 96%', jawaban: 'A', poin: 1 },
      { opsi_a: 'Faktor cuaca/iklim ekstrem dan hama babi hutan', opsi_b: 'Larangan resmi budidaya oleh pemerintah daerah', opsi_c: 'Hilangnya minat seluruh wisatawan domestik', jawaban: 'A', poin: 1 },

      // POS 3: Tumbuk & Nampih
      { opsi_a: 'Lisung kayu panjang', opsi_b: 'Tampah bambu bundar', opsi_c: 'Boboko anyaman', jawaban: 'A', poin: 1 },
      { opsi_a: 'Ngetok bulir', opsi_b: 'Nampih atau Menampi', opsi_c: 'Nyiram benih', jawaban: 'B', poin: 1 },
      { opsi_a: 'Pengeringan, pemecahan kulit luar, penyosohan aleuron, pemisahan dedak', opsi_b: 'Fermentasi ragi basah selama 3 minggu lalu direbus', opsi_c: 'Pembekuan cepat di dalam lemari es suhu sub-nol derajat', jawaban: 'A', poin: 1 },
      { opsi_a: 'Pakan ternak berkualitas dan teh herbal seduh', opsi_b: 'Bahan baku pembuatan kertas dokumen resmi negara', opsi_c: 'Campuran aspal jalan raya ramah lingkungan', jawaban: 'A', poin: 1 },
      { opsi_a: 'Kelompok Wanita Tani (KWT) Mekar Mandiri', opsi_b: 'Yayasan Cendikia Mulia Mandiri', opsi_c: 'Koperasi Gurandil Sejahtera', jawaban: 'A', poin: 1 },

      // POS 4: Panggang Rengginang
      { opsi_a: 'Kandungan zat glutennya lima kali lipat lebih rekat', opsi_b: 'Bebas gluten (gluten-free) secara alami dan bernutrisi tinggi', opsi_c: 'Memiliki warna hitam pekat alami tanpa pewarna', jawaban: 'B', poin: 1 },
      { opsi_a: 'Sekitar 10%', opsi_b: 'Sekitar 52%', opsi_c: 'Mencapai lebih dari 95%', jawaban: 'B', poin: 1 },
      { opsi_a: 'Rengginang, dodol, tape, dan wajit hanjeli', opsi_b: 'Bakpia, donat kentang, dan biskuit gandum', opsi_c: 'Mochi jepang dan kue lupis tepung ketan putih', jawaban: 'A', poin: 1 },
      { opsi_a: 'Karakteristik teksturnya pulen dan lengket setelah dimasak', opsi_b: 'Sangat mudah hancur menjadi air jika dipanaskan', opsi_c: 'Memiliki aroma harum bunga mawar yang kuat', jawaban: 'A', poin: 1 },
      { opsi_a: 'Chocochips, pizza, nastar, dan peanut cookies hanjeli', opsi_b: 'Macaron Perancis dan croissant mentega gurih', opsi_c: 'Bakpia kering panggang oven industri', jawaban: 'A', poin: 1 },
    ];

    const pertanyaanMap = [
      // POS 1
      ['Siapakah tokoh pelopor sekaligus pendiri (founder) Yayasan Rumah Hanjeli Indonesia yang menginisiasi budidaya ini?',
       'Berapa perbandingan kandungan protein biji hanjeli jika disandingkan dengan komoditas beras biasa?',
       'Kelompok masyarakat rentan manakah yang paling banyak diberdayakan dalam rantai eduwisata di Rumah Hanjeli?',
       'Di manakah alamat lengkap dari sekretariat fisik Yayasan Rumah Hanjeli Indonesia berada?',
       'Mengapa pangan fungsional berbasis biji hanjeli sangat direkomendasikan bagi penderita diabetes dan osteoporosis?'],
      // POS 2
      ['Berapa rata-rata waktu yang dibutuhkan dari masa penanaman awal biji hanjeli hingga siap dipanen petani?',
       'Mengapa petani di Desa Waluran Mandiri menerapkan pola tumpangsari dalam budidaya tanaman hanjeli?',
       'Apa nama alat potong tradisional genggam tangan khas Sunda yang digunakan untuk memanen bulir hanjeli secara manual?',
       'Teknik perlakuan awal apa yang dilakukan pada benih hanjeli sebelum disemai guna mempercepat perkecambahan?',
       'Faktor apa yang menyebabkan produksi hanjeli di Waluran Mandiri fluktuatif dan sempat turun menjadi 10 ton pada tahun 2025?'],
      // POS 3
      ['Alat tradisional apa yang digunakan sebagai wadah menumbuk biji hanjeli kering agar kulit luar cangkangnya terkelupas?',
       'Kegiatan memisahkan beras hanjeli dari sisa kulit ari menggunakan nampah bambu dengan gerakan tangan diayun disebut...',
       'Apa tahapan pemrosesan fisik yang harus dilalui biji hanjeli sebelum dapat diproses lebih lanjut menjadi tepung siap saji?',
       'Bagian sampingan tanaman hanjeli berupa daun segar dan sisa batang kering dimanfaatkan masyarakat untuk...',
       'Lembaga lokal manakah di Desa Waluran Mandiri yang secara konsisten mengelola produk olahan pangan hanjeli ini?'],
      // POS 4
      ['Apa keunggulan fungsional tepung hanjeli dalam pembuatan adonan kue kering (cookies) dibanding tepung gandum biasa?',
       'Berapa persentase kandungan pati yang terdapat di dalam tepung hanjeli berdasarkan hasil pengujian laboratorium?',
       'Jenis jajanan tradisional manis dan gurih apa saja yang diproduksi secara kolektif oleh warga dari beras hanjeli?',
       'Mengapa varietas Hanjeli Ketan lebih disukai sebagai bahan baku pembuatan rengginang dan dodol dibanding Hanjeli Batu?',
       'Produk kue kering inovatif non-pangan apa saja yang dilatihkan oleh akademisi UPI bagi para ibu eks-migran di Waluran?'],
    ];

    const penjelasanMap = [
      // POS 1
      ['Yayasan ini didirikan dan dikelola oleh Asep Hidayat Mustopa (Abah Asep) sebagai wadah pemberdayaan sosial masyarakat Waluran.',
       'Riset membuktikan hanjeli memiliki keunggulan protein tinggi sebesar 14,5% hingga 15,8%, mengalahkan beras biasa yang hanya 8,8%.',
       'Ekosistem wisata ini dirancang untuk menyerap tenaga kerja lokal dari kalangan rentan, terutama mantan pekerja migran dan penambang batu.',
       'Secara administratif, fasilitas edukasi utama Rumah Hanjeli berlokasi di Kampung Cekdam RT 10 RW 02, Desa Waluran Mandiri, Sukabumi.',
       'Karakteristik fisik hanjeli yang rendah indeks glikemik aman untuk diabetes, sedangkan kalsium tingginya mencegah osteoporosis.'],
      // POS 2
      ['Siklus tumbuh hanjeli tergolong lama, yaitu memerlukan waktu lima hingga enam bulan, sehingga petani harus cermat mengelola lahan.',
       'Pola tumpangsari (bersama padi, jagung, cabai, atau kacang) meminimalkan risiko ekonomi selama masa tunggu panen hanjeli yang panjang.',
       'Etem atau ani-ani merupakan warisan budaya agraris yang tetap dipertahankan untuk memotong tangkai malai hanjeli secara presisi.',
       'Perendaman dalam air hangat bersuhu 50°C berfungsi melunakkan cangkang keras biji sehingga memicu perkecambahan lebih cepat.',
       'Penurunan hasil panen dari 16 ton (2024) ke 10 ton (2025) disebabkan oleh tantangan cuaca ekstrem dan gangguan hama babi hutan.'],
      // POS 3
      ['Lisung adalah lesung kayu tradisional berukuran besar yang digunakan bersama alu untuk memisahkan kulit keras biji hanjeli.',
       'Nampi menggunakan nampah memanfaatkan hembusan angin untuk memisahkan sekam atau dedak ringan dari beras hanjeli yang berat.',
       'Biji hanjeli harus kering, dipecah kulitnya, disosoh untuk membersihkan aleuron, dan dipisahkan dari dedak sebelum digiling.',
       'Bagian batang dan daun merupakan pakan bergizi untuk hewan ternak, sementara daun keringnya berkhasiat diolah menjadi teh.',
       'KWT Mekar Mandiri memainkan peran sentral dalam mengorganisasikan ibu-ibu desa untuk memproses dan menjual produk olahan pangan.'],
      // POS 4
      ['Sifatnya yang bebas gluten membuat tepung hanjeli sangat aman bagi penderita celiac disease atau individu yang alergi gandum.',
       'Dengan kandungan pati sekitar 52%, tepung hanjeli memiliki struktur pati yang ideal untuk menggantikan peran tepung terigu dalam pembuatan kue.',
       'Olahan makanan ikonik desa ini meliputi produk renyah seperti rengginang, produk legit seperti dodol dan wajit, hingga tape fermentasi.',
       'Hanjeli ketan memiliki sifat gelatinisasi yang baik, menghasilkan tekstur liat dan lengket yang krusial untuk struktur dodol dan rengginang.',
       'Kolaborasi akademis melahirkan aneka resep kue kering (cookies) berbasis tepung hanjeli murni untuk diversifikasi oleh-oleh eduwisata.'],
    ];

async function seed() {
  console.log('[Seeder] Starting database seed...\n');

  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('[Seeder] Ensuring database exists...');
  await rootConn.query('CREATE DATABASE IF NOT EXISTS gamifikasi_dwh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await rootConn.end();

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gamifikasi_dwh',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
  });

  console.log('[Seeder] Importing schema via mysql CLI...');
  const sqlPath = path.join(__dirname, '..', 'database_schema.sql');
  const mysqlBin = 'C:\\xampp\\mysql\\bin\\mysql.exe';
  const { execFileSync } = require('child_process');
  try {
    execFileSync(mysqlBin, ['-u', 'root', 'gamifikasi_dwh'], {
      input: fs.readFileSync(sqlPath),
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  } catch (err) {
    console.error('Schema import failed:', err.message);
  }
  console.log('  ✓ Schema imported');

  const [tables] = await pool.query('SHOW TABLES');
  console.log(`  ✓ Database has ${tables.length} tables\n`);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    try { await conn.query('ALTER TABLE agenda ADD COLUMN no_phone_policy TINYINT(1) DEFAULT 0'); } catch { /* exists */ }
    try { await conn.query('ALTER TABLE quiz ADD COLUMN password VARCHAR(255) DEFAULT NULL'); } catch { /* exists */ }

    console.log('[Seeder] Clearing existing data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const tablesToTruncate = [
      'review_submission', 'review_kelompok', 'review',
      'lokasi_peserta', 'geofence_event', 'submission_aktivitas', 'progress_peserta',
      'activity_gallery', 'soal', 'daftar_soal', 'quiz', 'agenda_kelompok', 'agenda',
      'pos', 'peserta', 'kelompok'
    ];
    for (const t of tablesToTruncate) {
      try { await conn.query(`TRUNCATE TABLE ${t}`); } catch { /* not exist */ }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const kelompokIds = await seedKelompok(conn);
    console.log(`  ✓ Created ${kelompokIds.length} kelompok`);

    const posIds = await seedPos(conn);
    console.log(`  ✓ Created ${posIds.length} pos`);

    const { pesertaIds, pesertaPasswords } = await seedPeserta(conn, kelompokIds);
    console.log(`  ✓ Created ${pesertaIds.length} peserta`);

    const daftarSoalIds = await seedDaftarSoal(conn);
    console.log(`  ✓ Created ${daftarSoalIds.length} daftar soal (shared)`);

    const soalIds = await seedSoal(conn, daftarSoalIds, soalData, pertanyaanMap, penjelasanMap);
    console.log(`  ✓ Created ${soalIds.length} soal`);

    await seedAgendaAndQuiz(conn, kelompokIds, kelompokData, daftarSoalIds, posIds);
    await seedWorkerAssignment(conn);
    await seedReviews(conn, kelompokIds, kelompokData);

    await conn.commit();

    console.log('\n✅ [Seeder] Database seeded successfully!');
    printLoginAccounts(pesertaPasswords);
  } catch (err) {
    await conn.rollback();
    console.error('\n❌ [Seeder] Error:', err.message);
    throw err;
  } finally {
    conn.release();
    await pool.end();
    process.exit(0);
  }
}

async function seedKelompok(conn) {
  console.log('[Seeder] Creating kelompok...');
  const kelompokIds = [];
  for (const nama of kelompokData) {
    const [result] = await conn.query('INSERT INTO kelompok (nama) VALUES (?)', [nama]);
    kelompokIds.push(result.insertId);
  }
  return kelompokIds;
}

async function seedPos(conn) {
  console.log('[Seeder] Creating pos...');
  const posIds = [];
  for (const p of posData) {
    const [result] = await conn.query(
      'INSERT INTO pos (nama, latitude, longitude, radius_meter, deskripsi) VALUES (?, ?, ?, ?, ?)',
      [p.nama, p.latitude, p.longitude, p.radius, p.deskripsi]
    );
    posIds.push(result.insertId);
  }
  return posIds;
}

async function seedPeserta(conn, kelompokIds) {
  console.log('[Seeder] Creating peserta...');
  const pesertaIds = [];
  const pesertaPasswords = {};
  for (const p of pesertaData) {
    const kelompokId = p.kelompok_id !== null ? kelompokIds[p.kelompok_id] : null;
    const plainPassword = p.password || generatePesertaPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const [result] = await conn.query(
      'INSERT INTO peserta (nama, email, password_hash, role, kelompok_id) VALUES (?, ?, ?, ?, ?)',
      [p.nama, p.email, passwordHash, p.role, kelompokId]
    );
    pesertaIds.push(result.insertId);
    pesertaPasswords[p.email] = plainPassword;
  }
  return { pesertaIds, pesertaPasswords };
}

async function seedDaftarSoal(conn) {
  console.log('[Seeder] Creating daftar soal...');
  const daftarSoalIds = [];
  for (let p = 0; p < 4; p++) {
    const [result] = await conn.query('INSERT INTO daftar_soal (nama, kategori) VALUES (?, ?)', [`Daftar Pertanyaan POS ${p + 1}`, 'SMA']);
    daftarSoalIds.push(result.insertId);
  }
  return daftarSoalIds;
}

async function seedSoal(conn, daftarSoalIds, soalData, pertanyaanMap, penjelasanMap) {
  console.log('[Seeder] Creating soal...');
  const soalIds = [];
  for (let p = 0; p < 4; p++) {
    for (let s = 0; s < 5; s++) {
      const idx = p * 5 + s;
      const [result] = await conn.query(
        'INSERT INTO soal (daftar_soal_id, pertanyaan, opsi_a, opsi_b, opsi_c, jawaban_benar, penjelasan_jawaban_benar, poin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [daftarSoalIds[p], pertanyaanMap[p][s], soalData[idx].opsi_a, soalData[idx].opsi_b, soalData[idx].opsi_c, soalData[idx].jawaban, penjelasanMap[p][s], soalData[idx].poin]
      );
      soalIds.push(result.insertId);
    }
  }
  return soalIds;
}

async function seedAgendaAndQuiz(conn, kelompokIds, kelompokData, daftarSoalIds, posIds) {
  console.log('[Seeder] Creating agenda & quiz per kelompok...');
  const allPasswords = {};
  const configs = [
    { idx: 0, nama: 'Agenda Wisata SMK Telkom', noPhone: true },
    { idx: 1, nama: 'Agenda TPLM Tel-U', noPhone: false },
    { idx: 2, nama: 'Agenda KKN ITB', noPhone: true },
    { idx: 3, nama: 'Agenda Turis 30/6/2026', noPhone: false },
  ];
  const dates = [
    { start: '2026-06-26', end: '2026-07-26' },
    { start: '2026-07-01', end: '2026-08-01' },
    { start: '2026-07-05', end: '2026-08-05' },
    { start: '2026-07-10', end: '2026-08-10' },
  ];
  const mulai = ['08:00', '10:00', '13:00', '15:00'];
  const selesai = ['09:30', '11:30', '14:30', '16:30'];

  for (const cfg of configs) {
    const kid = kelompokIds[cfg.idx];
    const kelNama = kelompokData[cfg.idx];
    const [agendaResult] = await conn.query(
      'INSERT INTO agenda (nama, deskripsi, no_phone_policy, status) VALUES (?, ?, ?, ?)',
      [cfg.nama, `Agenda untuk kelompok ${kelNama}`, cfg.noPhone ? 1 : 0, 'active']
    );
    const agendaId = agendaResult.insertId;
    await conn.query('INSERT INTO agenda_kelompok (agenda_id, kelompok_id) VALUES (?, ?)', [agendaId, kid]);

    const tipe = cfg.noPhone ? 'kelompok' : 'individu';
    const agendaPasswords = {};
    for (let p = 0; p < 4; p++) {
      const pw = generateQuizPassword();
      agendaPasswords[`POS ${p + 1}`] = pw;
      await conn.query(
        'INSERT INTO quiz (agenda_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai, waktu_selesai, status, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [agendaId, daftarSoalIds[p], posIds[p], `${kelNama} POS ${p + 1}`, tipe, `${dates[cfg.idx].start} ${mulai[p]}:00`, `${dates[cfg.idx].end} ${selesai[p]}:00`, p === 0 ? 'active' : 'inactive', pw]
      );
    }
    Object.assign(allPasswords, agendaPasswords);
    console.log(`  ✓ Created agenda "${cfg.nama}" with 4 quiz (${cfg.noPhone ? 'No Phone' : 'Individu'}, ${dates[cfg.idx].start} → ${dates[cfg.idx].end})`);
    console.log(`    Passwords: ${Object.entries(agendaPasswords).map(([k, v]) => `${k}: ${v}`).join(' | ')}`);
  }
  return allPasswords;
}

async function seedWorkerAssignment(conn) {
  try {
    const [[workerRow]] = await conn.query("SELECT id FROM peserta WHERE email = 'pekerja1@pekerja' LIMIT 1");
    const [[smkAgenda]] = await conn.query("SELECT id FROM agenda WHERE nama = 'Agenda Wisata SMK Telkom' LIMIT 1");
    if (workerRow && smkAgenda) {
      await conn.query('CREATE TABLE IF NOT EXISTS agenda_worker (id INT AUTO_INCREMENT PRIMARY KEY, agenda_id INT NOT NULL, peserta_id INT NOT NULL, UNIQUE KEY uq (agenda_id, peserta_id))');
      await conn.query('INSERT IGNORE INTO agenda_worker (agenda_id, peserta_id) VALUES (?, ?)', [smkAgenda.id, workerRow.id]);
      console.log('  ✓ Assigned demo worker to Agenda Wisata SMK Telkom');
    }
  } catch { /* ignore */ }
}

async function seedReviews(conn, kelompokIds, kelompokData) {
  console.log('[Seeder] Creating review per kelompok...');
  for (let i = 0; i < kelompokIds.length; i++) {
    const [result] = await conn.query('INSERT INTO review (nama, deskripsi, status) VALUES (?, ?, ?)', [`Review Foto ${kelompokData[i]}`, `Upload foto aktivitas untuk kelompok ${kelompokData[i]}`, 'active']);
    await conn.query('INSERT INTO review_kelompok (review_id, kelompok_id) VALUES (?, ?)', [result.insertId, kelompokIds[i]]);
  }
  console.log(`  ✓ Created ${kelompokIds.length} review (1 per kelompok)`);
}

function printLoginAccounts(pesertaPasswords) {
  console.log('\n--- Login Accounts ---');
  const groups = {
    'Admin': ['admin1@admin', 'admin2@admin'],
    'Workers': ['pekerja1@pekerja', 'pekerja2@pekerja'],
    'Wisata SMK Telkom': ['apel@peserta', 'mangga@peserta', 'nanas@peserta', 'nadia2@peserta', 'bayu2@peserta'],
    'TPLM Tel-U': ['espresso@peserta', 'mocca@peserta', 'matcha@peserta', 'indah2@peserta', 'joko2@peserta'],
    'KKN ITB': ['kartika@peserta', 'lukman@peserta', 'maya@peserta', 'nanda@peserta', 'olivia@peserta'],
    'Turis 30/6/2026': ['putra@peserta', 'qori@peserta', 'rina@peserta', 'surya@peserta', 'tina@peserta'],
  };
  for (const [group, emails] of Object.entries(groups)) {
    console.log(`  ${group}:`);
    for (const email of emails) {
      console.log(`    ${email} / ${pesertaPasswords[email]}`);
    }
  }
}

seed();
