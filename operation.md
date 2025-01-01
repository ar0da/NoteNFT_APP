# Proje Fonksiyonları ve İşleyişi

## web3Service.js

### initializeWeb3
- Web3 ortamını başlatır.
- MetaMask'ın varlığını ve uygunluğunu kontrol eder.
- Kontrat bağlantısını kurar.

### connectWallet
- Kullanıcının cüzdanını bağlar.
- Hesap adresini döner.

### createNote
- Yeni bir not oluşturur.
- Gerekli parametreleri alır ve kontrat üzerinde `createNote` metodunu çağırır.

### mintNote
- Belirtilen tokenId için mint işlemi yapar.
- Gerekli kontrolleri ve gas hesaplamalarını yapar.

### hasNoteAccess
- Belirtilen tokenId ve hesap için erişim kontrolü yapar.

### getNoteDetails
- Belirtilen tokenId için not detaylarını alır.

### toggleNoteActive
- Belirtilen tokenId için notun aktif durumunu değiştirir.

### updateNotePrice
- Belirtilen tokenId için notun fiyatını günceller.

Bu fonksiyonlar, Web3 ve akıllı kontrat işlemlerini yönetmek için kullanılır. Her biri, belirli bir işlevi yerine getirmek için gerekli kontrolleri ve işlemleri yapar. 

## noteService.js

### getAllNotes
- Tüm notları sunucudan alır.

### createNote
- Yeni bir not oluşturur ve sunucuya gönderir.

### getNoteById
- Belirtilen `tokenId` için not detaylarını sunucudan alır.

### updateNote
- Belirtilen `tokenId` için notu günceller ve sunucuya gönderir.

## server.js

### MongoDB Bağlantısı
- MongoDB veritabanına bağlanır ve bağlantı durumunu kontrol eder.

### Note Şeması
- Notlar için bir Mongoose şeması tanımlar.

### API Rotaları
- **GET /api/notes**: Tüm notları getirir.
- **POST /api/notes**: Yeni bir not oluşturur.
- **GET /api/notes/:tokenId**: Belirli bir notu getirir.
- **PUT /api/notes/:tokenId**: Belirli bir notu günceller. 