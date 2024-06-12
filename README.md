# Layanan Upload File

Proyek ini adalah layanan upload file sederhana menggunakan Node.js dan Express. Layanan ini memungkinkan pengguna untuk mengupload file melalui form atau URL. File yang diupload disimpan sementara dan akan dihapus secara otomatis setelah 12 jam.

## Fitur

- **Upload File via Form**: Mengupload file melalui form HTML.
- **Upload File via URL**: Mengupload file dari URL yang ditentukan.
- **Penyimpanan Sementara**: File disimpan sementara dan dihapus setelah 12 jam.
- **Logging**: Pencatatan rinci dari permintaan dan kesalahan.
- **Penanganan Kesalahan Kustom**: Halaman kesalahan kustom untuk 404 dan kesalahan lainnya.

## Persyaratan

- Node.js
- npm

## Instalasi

1. Clone repository ini:

   ```bash
   git clone https://github.com/KiroFyzu/kiupload-vercel.git
   ```

2. Masuk ke direktori proyek:

   ```bash
   cd kiupload-vercel
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

## Konfigurasi

- **Direktori Upload**: Direktori upload default diatur ke `../../tmp/` untuk hosting di Vercel. Jika Anda menghosting secara lokal atau di server dedicated, ubah ke `./tmp/` dalam file `app.js`.

## Penggunaan

1. Mulai server:

   ```bash
   npm start
   ```

2. Server akan berjalan di `http://localhost:3000`.

## API Endpoints

### Upload File via Form

- **URL**: `/upload`
- **Metode**: `POST`
- **Field Form**: `file` (file input)

#### Respons

- **Sukses**:

  ```json
  {
    "credit": "https://github.com/KiroFyzu/",
    "message": "File uploaded successfully",
    "fileUrl": "http://localhost:3000/uploads/<filename>"
  }
  ```

- **Error**:

  ```json
  {
    "error": "Tidak ada file yang diupload atau media tidak support"
  }
  ```

### Upload File via URL

- **URL**: `/upload-url`
- **Metode**: `GET`
- **Parameter Query**: `url` (URL dari file yang akan diupload)

#### Respons

- **Sukses**:

  ```json
  {
    "credit": "https://github.com/KiroFyzu/",
    "message": "File uploaded successfully",
    "fileUrl": "http://localhost:3000/uploads/<filename>"
  }
  ```

- **Error**:

  ```json
  {
    "error": "URL tidak valid"
  }
  ```

## Tugas Terjadwal

- **Penghapusan File**: File lama (lebih dari 12 jam) dihapus setiap jam.

## Penanganan Kesalahan

- **404 Not Found**: Dialihkan ke handler kesalahan.
- **Kesalahan Lainnya**: Halaman kesalahan kustom dirender berdasarkan lingkungan.

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file [LICENSE](LICENSE) untuk detail lebih lanjut.

## Kredit

- Dikembangkan oleh [KiroFyzu](https://github.com/KiroFyzu/)

---

Dokumentasi ini memberikan gambaran komprehensif tentang layanan upload file, termasuk instruksi instalasi, penggunaan, endpoint API, dan lainnya. Jika Anda menemui masalah atau memiliki pertanyaan lebih lanjut, silakan merujuk ke [repository GitHub](https://github.com/KiroFyzu/kiupload-vercel).