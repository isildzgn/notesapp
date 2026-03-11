const express = require('express');
const cors = require('cors');
const sql = require('mssql/msnodesqlv8'); // Windows Authentication için özel sürücü
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Database Configuration
const config = {
    connectionString: 'Driver={SQL Server};Server=LAPTOP-2GNOC34V;Database=pariltinotDB;Trusted_Connection=yes;'
};

// Connect to Database
sql.connect(config).then(async pool => {
    if (pool.connected) {
        console.log("SQL Server'a başarıyla bağlandık! 🚀");

        // Tablo Oluşturma (Eğer yoksa)
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
                CREATE TABLE Users (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    name NVARCHAR(50) NOT NULL,
                    surname NVARCHAR(50) NOT NULL,
                    email NVARCHAR(100) NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT GETDATE()
                )
            `);
            console.log("Users tablosu kontrol edildi/oluşturuldu.");
        } catch (err) {
            console.error("Tablo oluşturma hatası:", err);
        }
    }
}).catch(err => {
    console.error("Veritabanı bağlantı hatası: ", err);
});

// Routes

// Kullanıcı Kaydı
app.post('/api/auth/register', async (req, res) => {
    const { name, surname, email } = req.body;

    if (!name || !surname || !email) {
        return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur.' });
    }

    try {
        const pool = await sql.connect(config);

        // Önce kullanıcı var mı diye kontrol et
        const checkUser = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        if (checkUser.recordset.length > 0) {
            // Kullanıcı zaten varsa, giriş yapmış gibi başarılı dönelim (veya hata döndürebiliriz)
            // Şimdilik mevcut kullanıcıyı döndürelim
            return res.json({ success: true, message: 'Kullanıcı zaten mevcut, giriş yapıldı.', user: checkUser.recordset[0] });
        }

        // Yeni kullanıcı ekle
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('surname', sql.NVarChar, surname)
            .input('email', sql.NVarChar, email)
            .query('INSERT INTO Users (name, surname, email) OUTPUT INSERTED.* VALUES (@name, @surname, @email)');

        res.json({ success: true, message: 'Kullanıcı başarıyla kaydedildi.', user: result.recordset[0] });

    } catch (err) {
        console.error("Kayıt hatası:", err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// Notları Getir
app.get('/api/notes', async (req, res) => {
    // Gerçek uygulamada: SELECT * FROM Notes WHERE ...
    // Şimdilik boş bir array dönelim veya mock data
    res.json([]);
});

// Yeni Not Ekle
app.post('/api/notes', async (req, res) => {
    const note = req.body;
    console.log('Yeni not eklendi:', note);
    // Db insert işlemi...
    res.json({ success: true, message: 'Not eklendi' });
});

// Not Sil
app.delete('/api/notes/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Not silindi:', id);
    // Db delete işlemi...
    res.json({ success: true, message: 'Not silindi' });
});

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
