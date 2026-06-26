-- =====================================================
-- Gamifikasi DWH - Database Schema v2
-- For XAMPP MySQL / MariaDB
-- Import this file in phpMyAdmin or run via MySQL CLI
-- =====================================================

DROP DATABASE IF EXISTS gamifikasi_dwh;

CREATE DATABASE gamifikasi_dwh
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gamifikasi_dwh;

-- =====================================================
-- TABEL: kelompok (tourist group / rombongan)
-- =====================================================
CREATE TABLE kelompok (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: peserta
-- =====================================================
CREATE TABLE peserta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('peserta', 'admin', 'worker') DEFAULT 'peserta',
  kelompok_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (kelompok_id) REFERENCES kelompok(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_kelompok (kelompok_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: pos (locations/places in Desa Wisata Hanjeli)
-- =====================================================
CREATE TABLE pos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meter INT DEFAULT 50,
  deskripsi TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_geo (latitude, longitude)
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: quiz (like an LMS class/course)
-- =====================================================
CREATE TABLE quiz (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: quiz_kelompok (which kelompok assigned to quiz)
-- =====================================================
CREATE TABLE quiz_kelompok (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  kelompok_id INT NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
  FOREIGN KEY (kelompok_id) REFERENCES kelompok(id) ON DELETE CASCADE,
  UNIQUE KEY unique_quiz_kelompok (quiz_id, kelompok_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: daftar_soal (question bank)
-- =====================================================
CREATE TABLE daftar_soal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kategori ENUM('TK', 'SD', 'SMP', 'SMA', 'Universitas', 'Bebas') DEFAULT 'Bebas',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: soal (individual question)
-- =====================================================
CREATE TABLE soal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  daftar_soal_id INT NOT NULL,
  pertanyaan TEXT NOT NULL,
  opsi_a TEXT,
  opsi_b TEXT,
  opsi_c TEXT,
  opsi_d TEXT,
  jawaban_benar ENUM('A', 'B', 'C', 'D') NOT NULL,
  penjelasan_jawaban_benar TEXT,
  poin INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (daftar_soal_id) REFERENCES daftar_soal(id) ON DELETE CASCADE,
  INDEX idx_daftar (daftar_soal_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: sesi (scheduled activity within a quiz)
-- =====================================================
CREATE TABLE sesi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  daftar_soal_id INT NOT NULL,
  pos_id INT NOT NULL,
  nama VARCHAR(255) NOT NULL,
  tipe ENUM('individu', 'kelompok') DEFAULT 'individu',
  waktu_mulai DATETIME,
  waktu_selesai DATETIME,
  status ENUM('inactive', 'active', 'completed') DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
  FOREIGN KEY (daftar_soal_id) REFERENCES daftar_soal(id) ON DELETE CASCADE,
  FOREIGN KEY (pos_id) REFERENCES pos(id) ON DELETE CASCADE,
  INDEX idx_quiz (quiz_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: jawaban (quiz answers - individual)
-- =====================================================
CREATE TABLE jawaban (
  id INT AUTO_INCREMENT PRIMARY KEY,
  peserta_id INT NOT NULL,
  sesi_id INT NOT NULL,
  soal_id INT NOT NULL,
  jawaban VARCHAR(255),
  benar BOOLEAN DEFAULT 0,
  skor INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (peserta_id) REFERENCES peserta(id) ON DELETE CASCADE,
  FOREIGN KEY (sesi_id) REFERENCES sesi(id) ON DELETE CASCADE,
  FOREIGN KEY (soal_id) REFERENCES soal(id) ON DELETE CASCADE,
  INDEX idx_peserta_sesi (peserta_id, sesi_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: kelompok_answer (for kelompok quiz type)
-- Pekerja inputs: which peserta answered correctly
-- =====================================================
CREATE TABLE kelompok_answer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sesi_id INT NOT NULL,
  kelompok_id INT NOT NULL,
  soal_id INT NOT NULL,
  peserta_id INT NOT NULL,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sesi_id) REFERENCES sesi(id) ON DELETE CASCADE,
  FOREIGN KEY (kelompok_id) REFERENCES kelompok(id) ON DELETE CASCADE,
  FOREIGN KEY (soal_id) REFERENCES soal(id) ON DELETE CASCADE,
  FOREIGN KEY (peserta_id) REFERENCES peserta(id) ON DELETE CASCADE,
  UNIQUE KEY unique_answer (sesi_id, soal_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: review (photo submission activity)
-- =====================================================
CREATE TABLE review (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: review_kelompok (which kelompok assigned to review)
-- =====================================================
CREATE TABLE review_kelompok (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  kelompok_id INT NOT NULL,
  FOREIGN KEY (review_id) REFERENCES review(id) ON DELETE CASCADE,
  FOREIGN KEY (kelompok_id) REFERENCES kelompok(id) ON DELETE CASCADE,
  UNIQUE KEY unique_review_kelompok (review_id, kelompok_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: review_submission (photo submission per kelompok per pos)
-- =====================================================
CREATE TABLE review_submission (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  kelompok_id INT NOT NULL,
  pos_id INT NOT NULL,
  foto_url VARCHAR(500),
  caption VARCHAR(255),
  nilai INT DEFAULT 0,
  status ENUM('pending', 'graded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES review(id) ON DELETE CASCADE,
  FOREIGN KEY (kelompok_id) REFERENCES kelompok(id) ON DELETE CASCADE,
  FOREIGN KEY (pos_id) REFERENCES pos(id) ON DELETE CASCADE,
  UNIQUE KEY unique_submission (review_id, kelompok_id, pos_id),
  INDEX idx_review (review_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABEL: lokasi_peserta (real-time GPS tracking)
-- =====================================================
CREATE TABLE lokasi_peserta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  peserta_id INT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meter FLOAT,
  inside_pos_id INT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (peserta_id) REFERENCES peserta(id) ON DELETE CASCADE,
  FOREIGN KEY (inside_pos_id) REFERENCES pos(id) ON DELETE SET NULL,
  UNIQUE KEY unique_peserta (peserta_id),
  INDEX idx_peserta (peserta_id)
) ENGINE=InnoDB;

-- =====================================================
-- DATA DEMO
-- Password for all demo accounts: "password123"
-- =====================================================
INSERT INTO kelompok (nama) VALUES
  ('SMPN 1 Bandung'),
  ('Universitas Telkom'),
  ('PT XYZ Tour Group');

INSERT INTO peserta (nama, email, password_hash, role, kelompok_id) VALUES
  ('Admin Desa Wisata', 'admin@hanjeli.com', '$2a$10$QXf2U3gc7eIjJwm1wprpTOdb4/27BK2W8/gg4Xua.npJbnC4aeZua', 'admin', NULL),
  ('Worker Pos', 'worker@hanjeli.com', '$2a$10$QXf2U3gc7eIjJwm1wprpTOdb4/27BK2W8/gg4Xua.npJbnC4aeZua', 'worker', NULL),
  ('Andi Pratama', 'andi@peserta.com', '$2a$10$QXf2U3gc7eIjJwm1wprpTOdb4/27BK2W8/gg4Xua.npJbnC4aeZua', 'peserta', 1),
  ('Budi Santoso', 'budi@peserta.com', '$2a$10$QXf2U3gc7eIjJwm1wprpTOdb4/27BK2W8/gg4Xua.npJbnC4aeZua', 'peserta', 1),
  ('Citra Dewi', 'citra@peserta.com', '$2a$10$QXf2U3gc7eIjJwm1wprpTOdb4/27BK2W8/gg4Xua.npJbnC4aeZua', 'peserta', 2),
  ('Dedi Kurniawan', 'dedi@peserta.com', '$2a$10$QXf2U3gc7eIjJwm1wprpTOdb4/27BK2W8/gg4Xua.npJbnC4aeZua', 'peserta', 2),
  ('Eka Putri', 'eka@peserta.com', '$2a$10$QXf2U3gc7eIjJwm1wprpTOdb4/27BK2W8/gg4Xua.npJbnC4aeZua', 'peserta', 3);

INSERT INTO pos (nama, latitude, longitude, radius_meter, deskripsi) VALUES
  ('Pos Pertanian', -6.91470000, 107.60980000, 50, 'Area pertanian dengan pemandangan sawah'),
  ('Pos Nge-Debug', -6.91500000, 107.61050000, 50, 'Workshop teknologi dan inovasi'),
  ('Pos Produksi', -6.91450000, 107.61100000, 50, 'Produksi kerajinan lokal'),
  ('Pos Kuliner', -6.91520000, 107.60950000, 50, 'Area kuliner tradisional');

INSERT INTO daftar_soal (nama, kategori) VALUES
  ('Soal Umum Desa Wisata', 'Bebas'),
  ('Soal Pertanian SD', 'SD');

INSERT INTO soal (daftar_soal_id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban_benar, poin) VALUES
  (1, 'Apa nama desa wisata?', 'Desa Wisata Hanjeli', 'Desa Wisata Bali', 'Desa Wisata Lombok', 'Desa Wisata Jawa', 'A', 1),
  (1, 'Apa tema gamifikasi?', 'Ekspedisi Waluran', 'Lomba Makan', 'Wisata Belajar', 'Bermain', 'A', 1),
  (1, 'Berapa pos yang harus diselesaikan?', '2', '3', '4', '5', 'B', 1),
  (2, 'Apa tanaman utama di sawah?', 'Padi', 'Jagung', 'Kedelai', 'Teh', 'A', 1),
  (2, 'Berapa musim tanam dalam setahun?', '1', '2', '3', '4', 'B', 1);

INSERT INTO quiz (nama, deskripsi) VALUES
  ('Quiz Ekspedisi Hanjeli', 'Quiz utama untuk semua kelompok yang berkunjung');

INSERT INTO quiz_kelompok (quiz_id, kelompok_id) VALUES
  (1, 1), (1, 2), (1, 3);

INSERT INTO sesi (quiz_id, daftar_soal_id, pos_id, nama, tipe, waktu_mulai, waktu_selesai, status) VALUES
  (1, 1, 1, 'Sesi Pagi - Pertanian', 'individu', '2026-06-25 09:00:00', '2026-06-25 10:30:00', 'active'),
  (1, 1, 2, 'Sesi Siang - Nge-Debug', 'kelompok', '2026-06-25 11:00:00', '2026-06-25 12:30:00', 'inactive'),
  (1, 2, 3, 'Sesi Sore - Produksi', 'individu', '2026-06-25 14:00:00', '2026-06-25 15:30:00', 'inactive');

INSERT INTO review (nama, deskripsi) VALUES
  ('Review Foto Ekspedisi', 'Upload foto aktivitas di setiap pos');

INSERT INTO review_kelompok (review_id, kelompok_id) VALUES
  (1, 1), (1, 2), (1, 3);
