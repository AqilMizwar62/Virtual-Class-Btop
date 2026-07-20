-- ============================================================
-- EDU BTOP SYSTEM - MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS btop;
USE btop;

-- 1. Users Table (Admin and Students)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Learning Sources Table (Tagged by 4 Core Subjects)
CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject ENUM('Math', 'Bahasa Inggeris', 'Bahasa Melayu', 'Sejarah') NOT NULL,
    category ENUM('note', 'video', 'document') DEFAULT 'note',
    file_path VARCHAR(255) NOT NULL,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Attendance Log Table (Logged automatically when student opens a material)
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    material_id INT NOT NULL,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- Pre-seed Initial Admin & Student User Accounts (Password: admin123 / student123)
-- bcrypt hash for 'admin123': $2b$10$b5VvF1xZ.F0dO6D9y0jUVOuL9t/5d6k7A7jB1C2D3E4F5G6H7I8J
INSERT IGNORE INTO users (id, name, email, password, role) VALUES 
(1, 'Admin BTOP', 'admin@btop.my', 'admin123', 'admin'),
(2, 'Ahmad Student', 'student1@edu.my', 'student123', 'student'),
(3, 'Siti Student', 'student2@edu.my', 'student123', 'student');

-- Pre-seed Sample Materials for Testing
INSERT IGNORE INTO materials (id, title, description, subject, category, file_path) VALUES
(1, 'Asas Algebra & Persamaan', 'Nota ringkas bab 1 Algebra untuk persediaan ujian', 'Math', 'note', '/uploads/math_algebra_notes.pdf'),
(2, 'English Grammar Guide: Tenses', 'Comprehensive guide to present & past tenses', 'Bahasa Inggeris', 'document', '/uploads/english_tenses_guide.pdf'),
(3, 'Panduan Karangan Bahasa Melayu', 'Teknik menulis karangan berformat dan contoh jawapan', 'Bahasa Melayu', 'note', '/uploads/bm_karangan_nota.pdf'),
(4, 'Sejarah Bab 1: Tamadun Awal', 'Video penerangan sejarah ringkas dan peta minda', 'Sejarah', 'video', '/uploads/sejarah_tamadun_video.mp4');
