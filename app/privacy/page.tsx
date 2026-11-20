import Link from "next/link";

export default function PrivacyPage() {
 return <main className="legal-page"><Link href="/signup">← Kayda dön</Link><p className="legal-eyebrow">NEXORA · SÜRÜM 2026-11-20</p><h1>Gizlilik Politikası</h1>
 <p>Bu taslak, Nexora'nın hesap ve oyun platformu özelliklerinde gizlilik yaklaşımını açıklar. Gerçek veri akışlarıyla uyumlu hâle getirilmeden nihai politika olarak kullanılmamalıdır.</p>
 <h2>İşlenebilecek veriler</h2><p>Hesap ve profil bilgileri, kullanıcı adı, e-posta, arkadaşlık ve mesajlaşma verileri, seçilen gizlilik tercihleri, bağlanan platform hesaplarına ait tanımlayıcılar ve izin verilen ölçüde oyun/çevrim içi durum verileri işlenebilir.</p>
 <h2>Amaçlar</h2><p>Hesap sağlama, arkadaş bulma, mesajlaşma, oyun kütüphanesi ve başarımları gösterme, birlikte oynanabilecek oyunları bulma, güvenliği sağlama ve hizmeti geliştirme amaçlarıyla kullanılabilir.</p>
 <h2>Görünürlük tercihleri</h2><p>Kullanıcılar desteklenen alanlarda herkese açık, arkadaşlara özel, seçilen kişilere özel veya kimseye gösterme seçeneklerini belirleyebilir. Bu kontroller, ilgili özellikte teknik olarak uygulandığı ölçüde geçerlidir; hassas veriler için varsayılan olarak en az paylaşım tercih edilir.</p>
 <h2>Üçüncü taraflar</h2><p>Platform bağlantıları ilgili sağlayıcının kimlik doğrulama sistemi ve izinleriyle yapılır. Sağlayıcının kendi gizlilik politikası ve koşulları ayrıca geçerlidir. Kullanıcılardan üçüncü taraf hesap parolalarını Nexora'ya vermeleri istenmemelidir.</p>
 <h2>Saklama ve haklar</h2><p>Veriler amaç için gerekli süre boyunca ve yasal yükümlülüklere uygun olarak saklanmalıdır. Kullanıcılar yürürlükteki kişisel verilerin korunması mevzuatı kapsamındaki bilgi alma, düzeltme, silme ve diğer hakları için Nexora'nın açıklanacak iletişim kanalından başvurabilir.</p>
 <p className="legal-warning">Yayına çıkmadan önce veri sorumlusu kimliği, iletişim bilgileri, hukuki işleme sebepleri, saklama süreleri, alıcı grupları, yurt dışı aktarım durumu, çerezler ve başvuru yöntemi gerçek uygulamaya göre doldurulmalı ve hukukçu tarafından incelenmelidir.</p></main>;
}