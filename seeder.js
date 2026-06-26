const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function seed() {
  console.log('[Seeder] Starting database seed...\n');

  // Create connection without database to drop/create it
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

  // Now connect to the database
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

  // Import schema from file using mysql CLI (more reliable for DDL)
  console.log('[Seeder] Importing schema via mysql CLI...');
  const sqlPath = path.join(__dirname, 'database_schema.sql');
  const { execSync } = require('child_process');
  try {
    execSync(`cmd /c "type "${sqlPath}" | C:\\xampp\\mysql\\bin\\mysql.exe -u root gamifikasi_dwh"`, {
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('Schema import failed:', err.message);
  }
  console.log('  ✓ Schema imported');

  // Verify tables exist
  const [tables] = await pool.query('SHOW TABLES');
  console.log(`  ✓ Database has ${tables.length} tables\n`);

  // Start seeding data
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Clear existing data
    console.log('[Seeder] Clearing existing data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const tablesToTruncate = [
      'kelompok_answer', 'jawaban', 'review_submission', 'review_kelompok', 'review',
      'lokasi_peserta', 'geofence_event', 'submission_aktivitas', 'progress_peserta',
      'activity_gallery', 'soal', 'daftar_soal', 'sesi', 'quiz_kelompok', 'quiz',
      'pos', 'peserta', 'kelompok'
    ];
    for (const t of tablesToTruncate) {
      try { await conn.query(`TRUNCATE TABLE ${t}`); } catch { /* table might not exist */ }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // =====================================================
    // KELOMPOK
    // =====================================================
    console.log('[Seeder] Creating kelompok...');
    const kelompokData = [
      'Wisata SMK Telkom',
      'TPLM Tel-U',
      'KKN ITB',
      'Turis 30/6/2026',
    ];

    const kelompokIds = [];
    for (const nama of kelompokData) {
      const [result] = await conn.query('INSERT INTO kelompok (nama) VALUES (?)', [nama]);
      kelompokIds.push(result.insertId);
    }
    console.log(`  ✓ Created ${kelompokIds.length} kelompok`);

    // =====================================================
    // PESERTA (5 per kelompok + admin + worker)
    // =====================================================
    console.log('[Seeder] Creating peserta...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const pesertaData = [
      { nama: 'Admin Desa Wisata', email: 'admin@hanjeli.com', role: 'admin', kelompok_id: null },
      { nama: 'Worker Pos', email: 'worker@hanjeli.com', role: 'worker', kelompok_id: null },
      // Wisata SMK Telkom (kelompokIds[0])
      { nama: 'Rizky Aditya', email: 'rizky@smktelkom.com', role: 'peserta', kelompok_id: kelompokIds[0] },
      { nama: 'Salsabila Putri', email: 'salsa@smktelkom.com', role: 'peserta', kelompok_id: kelompokIds[0] },
      { nama: 'Fajar Nugroho', email: 'fajar@smktelkom.com', role: 'peserta', kelompok_id: kelompokIds[0] },
      { nama: 'Nadia Rahma', email: 'nadia@smktelkom.com', role: 'peserta', kelompok_id: kelompokIds[0] },
      { nama: 'Bayu Setiawan', email: 'bayu@smktelkom.com', role: 'peserta', kelompok_id: kelompokIds[0] },
      // TPLM Tel-U (kelompokIds[1])
      { nama: 'Arief Wicaksono', email: 'arief@tplm.com', role: 'peserta', kelompok_id: kelompokIds[1] },
      { nama: 'Dina Kartika', email: 'dina@tplm.com', role: 'peserta', kelompok_id: kelompokIds[1] },
      { nama: 'Hendra Saputra', email: 'hendra@tplm.com', role: 'peserta', kelompok_id: kelompokIds[1] },
      { nama: 'Indah Permata', email: 'indah@tplm.com', role: 'peserta', kelompok_id: kelompokIds[1] },
      { nama: 'Joko Prasetyo', email: 'joko@tplm.com', role: 'peserta', kelompok_id: kelompokIds[1] },
      // KKN ITB (kelompokIds[2])
      { nama: 'Kartika Dewi', email: 'kartika@kkn-itb.com', role: 'peserta', kelompok_id: kelompokIds[2] },
      { nama: 'Lukman Hakim', email: 'lukman@kkn-itb.com', role: 'peserta', kelompok_id: kelompokIds[2] },
      { nama: 'Maya Anggraini', email: 'maya@kkn-itb.com', role: 'peserta', kelompok_id: kelompokIds[2] },
      { nama: 'Nanda Pratama', email: 'nanda@kkn-itb.com', role: 'peserta', kelompok_id: kelompokIds[2] },
      { nama: 'Olivia Sari', email: 'olivia@kkn-itb.com', role: 'peserta', kelompok_id: kelompokIds[2] },
      // Turis 30/6/2026 (kelompokIds[3])
      { nama: 'Putra Ramadhan', email: 'putra@turis.com', role: 'peserta', kelompok_id: kelompokIds[3] },
      { nama: 'Qori Handayani', email: 'qori@turis.com', role: 'peserta', kelompok_id: kelompokIds[3] },
      { nama: 'Rina Susanti', email: 'rina@turis.com', role: 'peserta', kelompok_id: kelompokIds[3] },
      { nama: 'Surya Darma', email: 'surya@turis.com', role: 'peserta', kelompok_id: kelompokIds[3] },
      { nama: 'Tina Marlina', email: 'tina@turis.com', role: 'peserta', kelompok_id: kelompokIds[3] },
    ];

    const pesertaIds = [];
    for (const p of pesertaData) {
      const [result] = await conn.query(
        'INSERT INTO peserta (nama, email, password_hash, role, kelompok_id) VALUES (?, ?, ?, ?, ?)',
        [p.nama, p.email, passwordHash, p.role, p.kelompok_id]
      );
      pesertaIds.push(result.insertId);
    }
    console.log(`  ✓ Created ${pesertaIds.length} peserta (password: "password123")`);

    // =====================================================
    // POS
    // =====================================================
    console.log('[Seeder] Creating pos...');
    const posData = [
      { nama: 'Rumah Hanjeli', latitude: -6.9147, longitude: 107.6098, radius: 50, deskripsi: 'Pusat koordinasi dan edukasi hanjeli' },
      { nama: 'Sawah Hanjeli', latitude: -6.9150, longitude: 107.6105, radius: 50, deskripsi: 'Area tanam dan panen hanjeli' },
      { nama: 'Tumbuk & Nampih', latitude: -6.9145, longitude: 107.6110, radius: 50, deskripsi: 'Proses pascapanen tradisional' },
      { nama: 'Panggang Rengginang', latitude: -6.9152, longitude: 107.6095, radius: 50, deskripsi: 'Produksi rengginang dan dodol' },
      { nama: 'Toko Aksesoris', latitude: -6.9148, longitude: 107.6100, radius: 50, deskripsi: 'Pembuatan aksesoris dari biji hanjeli' },
      { nama: 'Kebun Kopi', latitude: -6.9155, longitude: 107.6115, radius: 50, deskripsi: 'Perkebunan kopi arabika' },
      { nama: 'Kebun Karet', latitude: -6.9142, longitude: 107.6090, radius: 50, deskripsi: 'Kebun karet dan pabrik sheet lateks' },
    ];

    const posIds = [];
    for (const p of posData) {
      const [result] = await conn.query(
        'INSERT INTO pos (nama, latitude, longitude, radius_meter, deskripsi) VALUES (?, ?, ?, ?, ?)',
        [p.nama, p.latitude, p.longitude, p.radius, p.deskripsi]
      );
      posIds.push(result.insertId);
    }
    console.log(`  ✓ Created ${posIds.length} pos`);

    // =====================================================
    // DAFTAR SOAL (1 per POS, semua kategori SMA)
    // =====================================================
    console.log('[Seeder] Creating daftar soal...');
    const daftarSoalData = [
      { nama: 'SMA POS 1 - Edukasi Hanjeli di Rumah Hanjeli', kategori: 'SMA' },
      { nama: 'SMA POS 2 - Tanam dan Panen Hanjeli', kategori: 'SMA' },
      { nama: 'SMA POS 3 - Tumbuk dan Nampih Hanjeli', kategori: 'SMA' },
      { nama: 'SMA POS 4 - Rengginang Dodol Hanjeli', kategori: 'SMA' },
      { nama: 'SMA POS 5 - Aksesoris Hanjeli', kategori: 'SMA' },
      { nama: 'SMA POS 6 - Kebun Kopi', kategori: 'SMA' },
      { nama: 'SMA POS 7 - Kebun Karet', kategori: 'SMA' },
    ];
    const daftarSoalIds = [];
    for (const d of daftarSoalData) {
      const [result] = await conn.query('INSERT INTO daftar_soal (nama, kategori) VALUES (?, ?)', [d.nama, d.kategori]);
      daftarSoalIds.push(result.insertId);
    }
    console.log(`  ✓ Created ${daftarSoalIds.length} daftar soal`);

    // =====================================================
    // SOAL (5 pertanyaan per POS / daftar soal)
    // =====================================================
    console.log('[Seeder] Creating soal...');
    const soalData = [
      // POS 1: Edukasi Hanjeli di Rumah Hanjeli (daftarSoalIds[0])
      { daftar_id: daftarSoalIds[0], opsi_a: 'Abah Asep Hidayat Mustopa', opsi_b: 'Bapak Hely Sugriwa', opsi_c: 'Rahmat Yusuf', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[0], opsi_a: 'Lebih rendah, yaitu hanya sekitar 4%', opsi_b: 'Hampir dua kali lipat, mencapai 14,5% - 15,8%', opsi_c: 'Sama persis, yaitu sebesar 8,8%', jawaban: 'B', poin: 1 },
      { daftar_id: daftarSoalIds[0], opsi_a: 'Mantan pekerja migran (PMI) dan buruh penambang batu', opsi_b: 'Nelayan pesisir pantai selatan Sukabumi', opsi_c: 'Petani kelapa sawit skala industri', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[0], opsi_a: 'Kp. Cekdam Waluran RT 10/02, Desa Waluran Mandiri', opsi_b: 'Kp. Pasir Piring RT 05/01, Kecamatan Ciracap', opsi_c: 'Jl. Ciletuh Raya KM 12, Pelabuhanratu', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[0], opsi_a: 'Mengandung indeks glikemik tinggi dan sodium pekat', opsi_b: 'Memiliki indeks glikemik rendah dan tinggi kalsium', opsi_c: 'Mengandung senyawa gluten aktif pembakar lemak', jawaban: 'B', poin: 1 },

      // POS 2: Tanam dan Panen Hanjeli (daftarSoalIds[1])
      { daftar_id: daftarSoalIds[1], opsi_a: 'Sekitar 2 hingga 3 bulan saja', opsi_b: 'Sekitar 5 hingga 6 bulan lamanya', opsi_c: 'Lebih dari 12 bulan penuh', jawaban: 'B', poin: 1 },
      { daftar_id: daftarSoalIds[1], opsi_a: 'Mengoptimalkan lahan dan menutup waktu tunggu panen yang lama', opsi_b: 'Mempercepat masa panen hanjeli menjadi hanya 1 bulan', opsi_c: 'Memenuhi syarat wajib sertifikasi ekspor internasional', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[1], opsi_a: 'Etem (ani-ani)', opsi_b: 'Lisung kayu', opsi_c: 'Rakel bambu', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[1], opsi_a: 'Direndam di dalam air panas bersuhu 50°C selama 24 - 48 jam', opsi_b: 'Dijemur di bawah terik matahari ekstrem selama 7 hari', opsi_c: 'Direndam cairan alkohol berkadar murni 96%', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[1], opsi_a: 'Faktor cuaca/iklim ekstrem dan hama babi hutan', opsi_b: 'Larangan resmi budidaya oleh pemerintah daerah', opsi_c: 'Hilangnya minat seluruh wisatawan domestik', jawaban: 'A', poin: 1 },

      // POS 3: Tumbuk dan Nampih Hanjeli (daftarSoalIds[2])
      { daftar_id: daftarSoalIds[2], opsi_a: 'Lisung kayu panjang', opsi_b: 'Tampah bambu bundar', opsi_c: 'Boboko anyaman', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[2], opsi_a: 'Ngetok bulir', opsi_b: 'Nampih atau Menampi', opsi_c: 'Nyiram benih', jawaban: 'B', poin: 1 },
      { daftar_id: daftarSoalIds[2], opsi_a: 'Pengeringan, pemecahan kulit luar, penyosohan aleuron, pemisahan dedak', opsi_b: 'Fermentasi ragi basah selama 3 minggu lalu direbus', opsi_c: 'Pembekuan cepat di dalam lemari es suhu sub-nol derajat', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[2], opsi_a: 'Pakan ternak berkualitas dan teh herbal seduh', opsi_b: 'Bahan baku pembuatan kertas dokumen resmi negara', opsi_c: 'Campuran aspal jalan raya ramah lingkungan', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[2], opsi_a: 'Kelompok Wanita Tani (KWT) Mekar Mandiri', opsi_b: 'Yayasan Cendikia Mulia Mandiri', opsi_c: 'Koperasi Gurandil Sejahtera', jawaban: 'A', poin: 1 },

      // POS 4: Rengginang Dodol Hanjeli (daftarSoalIds[3])
      { daftar_id: daftarSoalIds[3], opsi_a: 'Kandungan zat glutennya lima kali lipat lebih rekat', opsi_b: 'Bebas gluten (gluten-free) secara alami dan bernutrisi tinggi', opsi_c: 'Memiliki warna hitam pekat alami tanpa pewarna', jawaban: 'B', poin: 1 },
      { daftar_id: daftarSoalIds[3], opsi_a: 'Sekitar 10%', opsi_b: 'Sekitar 52%', opsi_c: 'Mencapai lebih dari 95%', jawaban: 'B', poin: 1 },
      { daftar_id: daftarSoalIds[3], opsi_a: 'Rengginang, dodol, tape, dan wajit hanjeli', opsi_b: 'Bakpia, donat kentang, dan biskuit gandum', opsi_c: 'Mochi jepang dan kue lupis tepung ketan putih', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[3], opsi_a: 'Karakteristik teksturnya pulen dan lengket setelah dimasak', opsi_b: 'Sangat mudah hancur menjadi air jika dipanaskan', opsi_c: 'Memiliki aroma harum bunga mawar yang kuat', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[3], opsi_a: 'Chocochips, pizza, nastar, dan peanut cookies hanjeli', opsi_b: 'Macaron Perancis dan croissant mentega gurih', opsi_c: 'Bakpia kering panggang oven industri', jawaban: 'A', poin: 1 },

      // POS 5: Aksesoris Hanjeli (daftarSoalIds[4])
      { daftar_id: daftarSoalIds[4], opsi_a: 'Hanjeli Batu', opsi_b: 'Hanjeli Ketan', opsi_c: 'Hanjeli Kanyere', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[4], opsi_a: 'Warnanya tidak akan pudar dan mengkilap alami tanpa zat kimia', opsi_b: 'Dapat memancarkan cahaya terang di dalam kegelapan', opsi_c: 'Memiliki sifat elastis seperti karet setelah direbus', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[4], opsi_a: 'Gelang, kalung, tasbih, dan gantungan kunci', opsi_b: 'Sepatu kulit, kacamata hitam, dan topi anyaman daun kelapa', opsi_c: 'Bingkai foto kayu jati dan jam dinding otomatis', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[4], opsi_a: 'Gurandil', opsi_b: 'Etemers', opsi_c: 'Lisungers', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[4], opsi_a: 'Mesin laser Computer Numerical Control (CNC)', opsi_b: 'Mesin tenun Jacquard otomatis skala besar', opsi_c: 'Alat cetak tiup plastik bertekanan tinggi', jawaban: 'A', poin: 1 },

      // POS 6: Kebun Kopi (daftarSoalIds[5])
      { daftar_id: daftarSoalIds[5], opsi_a: 'Kopi Arabika (Arabica)', opsi_b: 'Kopi Robusta', opsi_c: 'Kopi Liberika', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[5], opsi_a: 'Menjaga mikroklimat ideal, kelembapan tanah, dan melindungi kopi dari terik matahari langsung', opsi_b: 'Mempercepat buah kopi matang secara instan dalam waktu satu minggu', opsi_c: 'Menghalangi masuknya hama babi hutan ke area perkebunan', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[5], opsi_a: 'Menjadi minuman fungsional kaya antioksidan bebas gluten dan kafein', opsi_b: 'Mengandung zat adiktif yang memicu kantuk instan', opsi_c: 'Meningkatkan kadar kolesterol jahat di dalam darah secara cepat', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[5], opsi_a: 'Mulai dari teknik penanaman bibit kopi hingga metode panen buah ceri', opsi_b: 'Teknik perakitan mesin espresso industri dari bahan bekas', opsi_c: 'Cara negosiasi ekspor kontainer kopi ke pasar Eropa', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[5], opsi_a: 'Batang pohon bambu dan batok kelapa', opsi_b: 'Serat daun pinus kering', opsi_c: 'Batuan basal hitam gunung api purba', jawaban: 'A', poin: 1 },

      // POS 7: Kebun Karet (daftarSoalIds[6])
      { daftar_id: daftarSoalIds[6], opsi_a: 'Teknik menggores/menyadap kulit batang pohon untuk mengambil getah', opsi_b: 'Teknik mencabut akar pohon karet tua menggunakan tali tambang', opsi_c: 'Metode penyulingan minyak atsiri dari daun pohon karet', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[6], opsi_a: 'Agar kulit pohon cepat mengelupas dan batang pohon cepat mengering', opsi_b: 'Untuk menjaga kesehatan pohon agar dapat memproduksi lateks secara berkelanjutan dalam jangka panjang', opsi_c: 'Supaya getah karet yang keluar langsung berubah menjadi padat di mangkuk', jawaban: 'B', poin: 1 },
      { daftar_id: daftarSoalIds[6], opsi_a: 'Lembaran karet mentah setengah jadi (sheet latex)', opsi_b: 'Ban kendaraan balap formula berskala internasional', opsi_c: 'Benang karet elastis siap jahit untuk industri garmen', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[6], opsi_a: 'Lateks atau getah karet cair', opsi_b: 'Resin pinus murni', opsi_c: 'Kloroform nabati', jawaban: 'A', poin: 1 },
      { daftar_id: daftarSoalIds[6], opsi_a: 'Kebun Teh Waluran', opsi_b: 'Perkebunan Kelapa Sawit', opsi_c: 'Hutan Lindung Pinus', jawaban: 'A', poin: 1 },
    ];

    // Map pertanyaan & penjelasan per daftar soal (POS)
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
      // POS 5
      ['Jenis varietas hanjeli apakah yang memiliki cangkang luar sangat keras mengkilap sehingga khusus dijadikan bahan baku aksesoris?',
       'Apa kelebihan alami dari biji Hanjeli Batu saat diolah menjadi produk kerajinan gelang atau kalung?',
       'Apa saja ragam produk aksesoris tangan kreatif yang dapat dirangkai langsung oleh wisatawan di stasiun edukasi ini?',
       'Apa julukan lokal bagi para penambang emas liar tradisional di kawasan hutan Waluran sebelum berdirinya desa wisata?',
       'Alat modern berbasis komputerisasi apa yang digunakan oleh kelompok pemuda kreatif desa untuk mengukir suvenir bambu?'],
      // POS 6
      ['Jenis komoditas kopi spesifik apakah yang ditanam dan diperkenalkan pemeliharaannya kepada wisatawan di kawasan kebun ini?',
       'Apa fungsi utama dari penanaman pohon peneduh di sekitar tanaman kopi arabika yang dikembangkan di kawasan ini?',
       'Apa penemuan ilmiah dari riset Fakultas Farmasi UI mengenai khasiat biji hanjeli yang disangrai menyerupai kopi?',
       'Rentang materi budidaya hulu-hilir apa saja yang diajarkan oleh pemandu wisata saat berada di Kebun Kopi Hanjeli?',
       'Selain kerajinan biji hanjeli, bahan alam ramah lingkungan apa yang diolah oleh divisi kreatif pemuda untuk teman minum kopi?'],
      // POS 7
      ['Keterampilan fisik apa yang diajarkan kepada wisatawan saat melakukan aktivitas praktik di kebun karet?',
       'Mengapa proses penyadapan getah karet harus dilakukan secara hati-hati tanpa merusak lapisan kambium bagian dalam pohon?',
       'Apa output produk setengah jadi yang dihasilkan oleh fasilitas pabrik pengolahan karet di Desa Wisata Hanjeli?',
       'Apa nama zat cair pekat berwarna putih susu yang keluar dari kulit batang pohon karet setelah disayat menggunakan pisau khusus?',
       'Dalam paket menginap (2 hari 1 malam), kunjungan ke Kebun Karet di hari kedua biasanya digabungkan dengan eduwisata ke...'],
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
      // POS 5
      ['Berbeda dari jenis ketan yang empuk, hanjeli batu bertekstur keras seperti batu mineral sehingga sangat ideal dirangkai menjadi manik-manik.',
       'Permukaan luar cangkang hanjeli batu memiliki lapisan pelindung alami yang awet dan semakin mengkilap bila sering bergesekan dengan kulit.',
       'Wisatawan diajarkan merangkai biji-biji hanjeli batu berlubang alami menjadi aksesoris estetis seperti gelang, kalung, dan untaian tasbih.',
       'Istilah "Gurandil" merujuk pada warga lokal yang menambang emas secara ilegal dengan metode tradisional yang berisiko tinggi.',
       'Penggunaan mesin laser CNC membantu pemuda lokal mengukir produk bambu seperti tumbler secara presisi, cepat, dan bernilai seni tinggi.'],
      // POS 6
      ['Wisatawan diajad berinteraksi langsung dengan pohon kopi jenis arabika yang dikembangkan secara organik di bawah naungan pohon peneduh.',
       'Pohon peneduh sangat krusial dalam budidaya kopi arabika dataran menengah untuk mengontrol intensitas cahaya matahari dan menjaga kelembapan tanah agar kualitas ceri kopi optimal.',
       'Biji hanjeli sangrai berkhasiat menghambat enzim alfa-glukosidase (anti-diabetes) serta menjadi alternatif pengganti kopi bebas kafein.',
       'Wisatawan diajarkan siklus hidup pohon kopi, cara memilah buah kopi arabika matang pohon (cherry merah), hingga teknik pemetikan.',
       'Divisi kreatif mengolah bambu dan batok kelapa menjadi cangkir, tumbler, dan suvenir pelengkap aktivitas minum kopi atau teh pengunjung.'],
      // POS 7
      ['Pengunjung diajak mempraktikkan penyadapan menggunakan pisau sadap melengkung guna mengalirkan lateks tanpa merusak kambium pohon.',
       'Lapisan kambium adalah area pertumbuhan pohon. Jika kambium rusak akibat sayatan yang terlalu dalam, pohon akan mengalami cacat permanen (buku-buku) dan produksi getahnya akan terhenti.',
       'Pabrik desa memproses lateks cair mentah dari perkebunan melalui proses koagulasi dan penggilingan hingga menjadi lembaran karet setengah jadi.',
       'Cairan putih susu tersebut adalah lateks mentah, emulsi koloid yang mengandung partikel polimer karet alam berkerapatan tinggi.',
       'Paket eduwisata menginap memadukan kunjungan ke kebun karet dan Kebun Teh Waluran sebagai aktivitas penutup sebelum wisatawan pulang.'],
    ];

    const soalIds = [];
    for (let i = 0; i < soalData.length; i++) {
      const s = soalData[i];
      const daftarIndex = Math.floor(i / 5);
      const soalIndex = i % 5;
      const [result] = await conn.query(
        'INSERT INTO soal (daftar_soal_id, pertanyaan, opsi_a, opsi_b, opsi_c, jawaban_benar, penjelasan_jawaban_benar, poin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [s.daftar_id, pertanyaanMap[daftarIndex][soalIndex], s.opsi_a, s.opsi_b, s.opsi_c, s.jawaban, penjelasanMap[daftarIndex][soalIndex], s.poin]
      );
      soalIds.push(result.insertId);
    }
    console.log(`  ✓ Created ${soalIds.length} soal`);

    // =====================================================
    // QUIZ (1 per kelompok, all 7 POS as sesi)
    // =====================================================
    console.log('[Seeder] Creating quiz & sesi per kelompok...');

    // Wisata SMK Telkom & KKN ITB = all kelompok type
    // TPLM Tel-U & Turis 30/6/2026 = all individu type
    const kelompokQuizConfig = [
      { kelompokIdx: 0, quizNama: 'Quiz Wisata SMK Telkom', defaultTipe: 'kelompok' },
      { kelompokIdx: 1, quizNama: 'Quiz TPLM Tel-U', defaultTipe: 'individu' },
      { kelompokIdx: 2, quizNama: 'Quiz KKN ITB', defaultTipe: 'kelompok' },
      { kelompokIdx: 3, quizNama: 'Quiz Turis 30/6/2026', defaultTipe: 'individu' },
    ];

    const posNames = ['POS 1', 'POS 2', 'POS 3', 'POS 4', 'POS 5', 'POS 6', 'POS 7'];
    const waktuMulai = ['08:00', '09:30', '11:00', '13:00', '14:30', '16:00', '17:30'];
    const waktuSelesai = ['09:15', '10:45', '12:15', '14:15', '15:45', '17:15', '18:45'];

    for (const config of kelompokQuizConfig) {
      const kid = kelompokIds[config.kelompokIdx];
      const kelNama = kelompokData[config.kelompokIdx];

      // Create quiz for this kelompok
      const [quizResult] = await conn.query(
        'INSERT INTO quiz (nama, deskripsi, status) VALUES (?, ?, ?)',
        [config.quizNama, `Quiz untuk kelompok ${kelNama}`, 'active']
      );
      const quizId = quizResult.insertId;

      // Assign quiz to this kelompok only
      await conn.query('INSERT INTO quiz_kelompok (quiz_id, kelompok_id) VALUES (?, ?)', [quizId, kid]);

      // Create 1 sesi per POS (7 sesi total)
      for (let p = 0; p < 7; p++) {
        const [result] = await conn.query(
          'INSERT INTO sesi (quiz_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai, waktu_selesai, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            quizId,
            daftarSoalIds[p],
            posIds[p],
            `${kelNama} ${posNames[p]}`,
            config.defaultTipe,
            `2026-06-26 ${waktuMulai[p]}:00`,
            `2026-06-26 ${waktuSelesai[p]}:00`,
            p === 0 ? 'active' : 'inactive',
          ]
        );
      }

      console.log(`  ✓ Created quiz "${config.quizNama}" with 7 sesi (${config.defaultTipe})`);
    }

    // =====================================================
    // REVIEW (1 per kelompok)
    // =====================================================
    console.log('[Seeder] Creating review per kelompok...');
    for (let i = 0; i < kelompokIds.length; i++) {
      const [reviewResult] = await conn.query(
        'INSERT INTO review (nama, deskripsi, status) VALUES (?, ?, ?)',
        [`Review Foto ${kelompokData[i]}`, `Upload foto aktivitas untuk kelompok ${kelompokData[i]}`, 'active']
      );
      const reviewId = reviewResult.insertId;
      await conn.query('INSERT INTO review_kelompok (review_id, kelompok_id) VALUES (?, ?)', [reviewId, kelompokIds[i]]);
    }
    console.log(`  ✓ Created ${kelompokIds.length} review (1 per kelompok)`);

    await conn.commit();

    console.log('\n✅ [Seeder] Database seeded successfully!');
    console.log('\n--- Login Accounts (password: "password123") ---');
    console.log('  Admin:  admin@hanjeli.com');
    console.log('  Worker: worker@hanjeli.com');
    console.log('  Wisata SMK Telkom: rizky@smktelkom.com | salsa@smktelkom.com | fajar@smktelkom.com | nadia@smktelkom.com | bayu@smktelkom.com');
    console.log('  TPLM Tel-U: arief@tplm.com | dina@tplm.com | hendra@tplm.com | indah@tplm.com | joko@tplm.com');
    console.log('  KKN ITB: kartika@kkn-itb.com | lukman@kkn-itb.com | maya@kkn-itb.com | nanda@kkn-itb.com | olivia@kkn-itb.com');
    console.log('  Turis 30/6/2026: putra@turis.com | qori@turis.com | rina@turis.com | surya@turis.com | tina@turis.com');

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

seed();
