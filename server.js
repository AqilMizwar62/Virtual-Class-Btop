require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

// Database Connection
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'btop',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Development pages change frequently; prevent browsers from keeping stale UI.
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path === '/') {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));
app.use('/views', express.static(path.join(__dirname, 'views')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Helper Authentication Middleware
const requireAuth = (role = null) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
        }
        if (role && req.session.user.role !== role) {
            return res.status(403).json({ success: false, message: 'Forbidden. Access restricted.' });
        }
        next();
    };
};

// ============================================================
// ROUTES & API ENDPOINTS
// ============================================================

// Serve Root -> Public Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});

// Friendly Login Page Route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Edu Btop', 'login.html'));
});

app.get('/student-dashboard', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(__dirname, 'views', 'student', 'dashboard_student.html'));
});

// ------------------------------------------------------------
// 1. AUTHENTICATION APIs
// ------------------------------------------------------------

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Sila masukkan e-mel dan kata laluan.' });
    }

    try {
        let query = 'SELECT * FROM users WHERE email = ?';
        let params = [email];

        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }

        const [rows] = await db.query(query, params);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Akaun tidak dijumpai atau e-mel salah.' });
        }

        const user = rows[0];

        // Check password (supports bcrypt or fallback plain-text for easy dev testing)
        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Kata laluan tidak tepat.' });
        }

        // Store user in session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        const redirectUrl = user.role === 'admin'
            ? '/views/admin/dashboard_admin.html'
            : '/student-dashboard';

        return res.json({
            success: true,
            message: 'Log masuk berjaya!',
            user: req.session.user,
            redirectUrl: redirectUrl
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Ralat pelayan / sambungan pangkalan data.' });
    }
});

// GET /api/me
app.get('/api/me', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ success: true, user: req.session.user });
    }
    return res.status(401).json({ success: false, message: 'Belum log masuk.' });
});

// GET /api/logout
app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ralat semasa log keluar.' });
        }
        res.clearCookie('connect.sid');
        return res.json({ success: true, message: 'Berjaya log keluar.' });
    });
});

// ------------------------------------------------------------
// 2. LEARNING MATERIALS APIs (4 SUBJECTS)
// ------------------------------------------------------------

// GET /api/materials (Optionally filter by subject)
app.get('/api/materials', async (req, res) => {
    const { subject } = req.query;

    try {
        let sql = `
            SELECT m.*, u.name as uploader_name 
            FROM materials m 
            LEFT JOIN users u ON m.uploaded_by = u.id
        `;
        let params = [];

        if (subject && subject !== 'All') {
            sql += ' WHERE m.subject = ?';
            params.push(subject);
        }

        sql += ' ORDER BY m.created_at DESC';

        const [rows] = await db.query(sql, params);
        return res.json({ success: true, materials: rows });
    } catch (err) {
        console.error('Fetch materials error:', err);
        return res.status(500).json({ success: false, message: 'Gagal memuat turun bahan pembelajaran.' });
    }
});

// POST /api/admin/materials (Admin Upload Material)
app.post('/api/admin/materials', requireAuth('admin'), upload.single('file'), async (req, res) => {
    const { title, description, subject, category } = req.body;

    if (!title || !subject) {
        return res.status(400).json({ success: false, message: 'Tajuk dan Subjek adalah wajib.' });
    }

    let filePath = '';
    if (req.file) {
        filePath = '/uploads/' + req.file.filename;
    } else if (req.body.external_link) {
        filePath = req.body.external_link;
    } else {
        return res.status(400).json({ success: false, message: 'Sila muat naik fail atau sertakan pautan bahan.' });
    }

    try {
        const sql = `
            INSERT INTO materials (title, description, subject, category, file_path, uploaded_by) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [
            title,
            description || '',
            subject,
            category || 'note',
            filePath,
            req.session.user.id
        ]);

        return res.json({
            success: true,
            message: 'Bahan pembelajaran berjaya dimuat naik!',
            materialId: result.insertId
        });
    } catch (err) {
        console.error('Upload material error:', err);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan bahan pembelajaran.' });
    }
});

// DELETE /api/admin/materials/:id
app.delete('/api/admin/materials/:id', requireAuth('admin'), async (req, res) => {
    const materialId = req.params.id;
    try {
        await db.query('DELETE FROM materials WHERE id = ?', [materialId]);
        return res.json({ success: true, message: 'Bahan berjaya dipadam.' });
    } catch (err) {
        console.error('Delete material error:', err);
        return res.status(500).json({ success: false, message: 'Gagal memadam bahan.' });
    }
});

// PUT /api/admin/materials/:id (Update material including new file upload or link)
app.put('/api/admin/materials/:id', requireAuth('admin'), upload.single('file'), async (req, res) => {
    const materialId = req.params.id;
    const { title, description, subject, category, external_link, existing_file_path } = req.body;

    try {
        let filePath = existing_file_path || '';
        if (req.file) {
            filePath = '/uploads/' + req.file.filename;
        } else if (external_link) {
            filePath = external_link;
        }

        await db.query(
            'UPDATE materials SET title = ?, description = ?, subject = ?, category = ?, file_path = ? WHERE id = ?',
            [title, description || '', subject, category || 'note', filePath, materialId]
        );
        return res.json({ success: true, message: 'Bahan pembelajaran berjaya dikemaskini!' });
    } catch (err) {
        console.error('Update material error:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengemaskini bahan.' });
    }
});

// ------------------------------------------------------------
// 3. STUDENT MANAGEMENT APIs (ADMIN)
// ------------------------------------------------------------

// GET /api/admin/students
app.get('/api/admin/students', requireAuth('admin'), async (req, res) => {
    try {
        const [students] = await db.query(
            'SELECT id, name, email, created_at FROM users WHERE role = "student" ORDER BY created_at DESC'
        );
        return res.json({ success: true, students });
    } catch (err) {
        console.error('Fetch students error:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengambil senarai pelajar.' });
    }
});

// POST /api/admin/students (Add new student email)
app.post('/api/admin/students', requireAuth('admin'), async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Sila lengkapkan Nama, E-mel dan Kata Laluan.' });
    }

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "student")',
            [name, email, hashedPassword]
        );

        return res.json({
            success: true,
            message: 'Pelajar baru berjaya didaftarkan ke dalam sistem!',
            studentId: result.insertId
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'E-mel pelajar ini sudah wujud dalam pangkalan data.' });
        }
        console.error('Add student error:', err);
        return res.status(500).json({ success: false, message: 'Gagal mendaftar pelajar baru.' });
    }
});

// ------------------------------------------------------------
// 4. ATTENDANCE & REPORTING APIs
// ------------------------------------------------------------

// POST /api/student/attendance (Triggered when student accesses a material - records only once)
app.post('/api/student/attendance', requireAuth('student'), async (req, res) => {
    const { materialId } = req.body;
    const studentId = req.session.user.id;

    if (!materialId) {
        return res.status(400).json({ success: false, message: 'Material ID diperlukan.' });
    }

    try {
        // Check if student has already accessed this material
        const [existing] = await db.query(
            'SELECT id FROM attendance WHERE student_id = ? AND material_id = ?',
            [studentId, materialId]
        );

        if (existing.length === 0) {
            // Insert attendance record only if it doesn't exist
            await db.query(
                'INSERT INTO attendance (student_id, material_id) VALUES (?, ?)',
                [studentId, materialId]
            );
        }

        return res.json({
            success: true,
            message: 'Kehadiran berjaya direkodkan!'
        });
    } catch (err) {
        console.error('Attendance log error:', err);
        return res.status(500).json({ success: false, message: 'Gagal merekod kehadiran.' });
    }
});

// GET /api/admin/attendance-stats (Attendance breakdown per student and subject - deduplicated)
app.get('/api/admin/attendance-stats', requireAuth('admin'), async (req, res) => {
    try {
        const sql = `
            SELECT 
                u.id as student_id,
                u.name as student_name,
                u.email as student_email,
                m.subject,
                m.title as material_title,
                MAX(a.accessed_at) as accessed_at
            FROM attendance a
            JOIN users u ON a.student_id = u.id
            JOIN materials m ON a.material_id = m.id
            GROUP BY u.id, u.name, u.email, m.id, m.subject, m.title
            ORDER BY accessed_at DESC
        `;
        const [rows] = await db.query(sql);

        // Summary counts
        const [totalStudents] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
        const [totalMaterials] = await db.query('SELECT COUNT(*) as count FROM materials');
        const [totalAttendance] = await db.query('SELECT COUNT(DISTINCT student_id) as count FROM attendance');

        return res.json({
            success: true,
            stats: {
                totalStudents: totalStudents[0].count,
                totalMaterials: totalMaterials[0].count,
                totalAttendance: totalAttendance[0].count,
                records: rows
            }
        });
    } catch (err) {
        console.error('Fetch attendance stats error:', err);
        return res.status(500).json({ success: false, message: 'Gagal memuat turun data kehadiran.' });
    }
});

// GET /api/admin/reports (Generate summary teacher report by subject)
app.get('/api/admin/reports', requireAuth('admin'), async (req, res) => {
    try {
        const sql = `
            SELECT 
                m.subject,
                COUNT(DISTINCT a.id) as total_views,
                COUNT(DISTINCT a.student_id) as unique_students_attended,
                COUNT(DISTINCT m.id) as total_materials_available,
                (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students
            FROM materials m
            LEFT JOIN attendance a ON m.id = a.material_id
            GROUP BY m.subject
        `;
        const [subjectReports] = await db.query(sql);

        const [studentAttendanceSummary] = await db.query(`
            SELECT 
                u.name,
                u.email,
                COUNT(DISTINCT a.material_id) as materials_accessed,
                MAX(a.accessed_at) as last_activity
            FROM users u
            LEFT JOIN attendance a ON u.id = a.student_id
            WHERE u.role = "student"
            GROUP BY u.id, u.name, u.email
        `);

        const [totalStudentsCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');

        return res.json({
            success: true,
            totalStudents: totalStudentsCount[0].count,
            subjectReports,
            studentAttendanceSummary
        });
    } catch (err) {
        console.error('Generate report error:', err);
        return res.status(500).json({ success: false, message: 'Gagal menjana laporan.' });
    }
});

// GET /api/admin/subject-attendance-detail (Get detailed student attendance list for a specific subject)
app.get('/api/admin/subject-attendance-detail', requireAuth('admin'), async (req, res) => {
    const { subject } = req.query;

    if (!subject) {
        return res.status(400).json({ success: false, message: 'Subjek diperlukan.' });
    }

    try {
        const sql = `
            SELECT 
                u.id as student_id,
                u.name as student_name,
                u.email as student_email,
                (SELECT COUNT(*) FROM materials WHERE subject = ?) as total_materials,
                (
                    SELECT COUNT(DISTINCT a.material_id) 
                    FROM attendance a
                    JOIN materials m ON a.material_id = m.id
                    WHERE a.student_id = u.id AND m.subject = ?
                ) as materials_accessed
            FROM users u
            WHERE u.role = 'student'
            ORDER BY u.name ASC
        `;
        const [rows] = await db.query(sql, [subject, subject]);
        return res.json({ success: true, subject, records: rows });
    } catch (err) {
        console.error('Fetch subject attendance detail error:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengambil butiran kehadiran subjek.' });
    }
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`EDU BTOP Server is running on port ${PORT}`);
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(`===================================================`);
});
