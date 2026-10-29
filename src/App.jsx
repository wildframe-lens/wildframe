import React, { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { Camera, Leaf, LockKeyhole, LogOut, Upload, X, Trash2, ArrowDownToLine, Images, Menu } from 'lucide-react'

const BUCKET = 'wildframe-photos'
const MAX_FILE_MB = 8
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

function App() {
  const [photos, setPhotos] = useState([])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [selected, setSelected] = useState(null)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  const isAdmin = Boolean(session?.user)

  async function loadPhotos() {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    const { data, error: fetchError } = await supabase
      .from('photos')
      .select('id, caption, file_path, created_at')
      .order('created_at', { ascending: false })
    if (fetchError) setError(fetchError.message)
    else {
      const rows = (data || []).map((p) => ({
        ...p,
        url: supabase.storage.from(BUCKET).getPublicUrl(p.file_path).data.publicUrl
      }))
      setPhotos(rows)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    loadPhotos()
    return () => listener.subscription.unsubscribe()
  }, [])

  const photoCount = useMemo(() => String(photos.length).padStart(2, '0'), [photos.length])

  async function signIn(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (signInError) setError('Login nahi ho paya. Email/password check karein.')
    else {
      setNotice('Admin login successful.')
      setShowLogin(false)
      setPassword('')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setNotice('You have been signed out.')
  }

  async function uploadPhoto(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!file) return setError('Pehle ek photo select karein.')
    if (!allowedTypes.includes(file.type)) return setError('Sirf JPG, PNG ya WebP image upload karein.')
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`Photo ${MAX_FILE_MB} MB se chhoti honi chahiye.`)
    if (!isAdmin) return setError('Upload karne ke liye Admin Login zaroori hai.')

    setBusy(true)
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-')
    const path = `${session.user.id}/${Date.now()}-${safeName}`
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
 })
    if (storageError) {
      setBusy(false)
      return setError(`Upload failed: ${storageError.message}`)
    }

    const { error: rowError } = await supabase.from('photos').insert({
      caption: caption.trim() || 'A moment in nature',
      file_path: path
    })
    if (rowError) {
      await supabase.storage.from(BUCKET).remove([path])
      setBusy(false)
      return setError(`Photo save nahi hui: ${rowError.message}`)
    }

    setFile(null)
    setCaption('')
    e.target.reset()
    await loadPhotos()
    setBusy(false)
    setNotice('Photo gallery mein upload ho gayi!')
  }

  async function deletePhoto(photo) {
    if (!isAdmin) return
    if (!window.confirm('Is photo ko permanently delete karna hai?')) return
    setError('')
    setNotice('')
    setBusy(true)
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.file_path])
    if (storageError) {
      setBusy(false)
      return setError(`Delete failed: ${storageError.message}`)
    }
    const { error: rowError } = await supabase.from('photos').delete().eq('id', photo.id)
    setBusy(false)
    if (rowError) setError(rowError.message)
    else {
      if (selected?.id === photo.id) setSelected(null)
      setPhotos((old) => old.filter((p) => p.id !== photo.id))
      setNotice('Photo delete ho gayi.')
    }
  }

 
async function downloadPhoto(photo) {
  try {
    const response = await fetch(photo.url);

    console.log("Download response:", response.status, response.ok);

    if (!response.ok) {
      throw new Error('Photo download failed');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download =
      photo.file_path?.split('/').pop() ||
      photo.file_path?.split('/').pop() ||
      'wildframe-photo.jpg';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    console.error('Download error:', error);
    setError?.('Photo download nahi hui. Dobara try karein.');
  }
}


  return (
    <div className="site-shell">
      <header className="nav">
        <a className="brand" href="#home" aria-label="WildFrame home">
          <span className="brand-mark"><Leaf size={21} /></span>
          <span>WILDFRAME<small>NATURE THROUGH MY LENS</small></span>
        </a>
        <button className="mobile-toggle icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu"><Menu /></button>
        <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}>
          <a href="#gallery" onClick={() => setMobileMenu(false)}>Gallery</a>
          <a href="#about" onClick={() => setMobileMenu(false)}>About</a>
          {isAdmin ? (
            <button className="nav-admin" onClick={signOut}><LogOut size={15} /> Sign out</button>
          ) : (
            <button className="nav-admin" onClick={() => { setShowLogin(true); setMobileMenu(false) }}><LockKeyhole size={15} /> Admin</button>
          )}
        </nav>
      </header>

      <main>   <section className="hero" id="home">
                <div className="hero-shade" />
                <div className="leaf-layer" aria-hidden="true">
                  <span className="wind-leaf wind-leaf-1" />
                  <span className="wind-leaf wind-leaf-2" />
                  <span className="wind-leaf wind-leaf-3" />
                  <span className="wind-leaf wind-leaf-4" />
                  <span className="wind-leaf wind-leaf-5" />
                  <span className="wind-leaf wind-leaf-6" />
                  <span className="wind-leaf wind-leaf-7" />
                </div>
                <div className="hero-content">
                  <div className="eyebrow"><span /> THE BEAUTY IN EVERY DETAIL</div>
                  <h1>Nature is full of<br /><em>little wonders.</em></h1>
                  <p>Quiet moments, tiny creatures, golden skies — the world looks different when you take a closer look.</p>
                  <a className="primary-button" href="#gallery">Explore the gallery <span>↗</span></a>
                </div>
                <div className="hero-note"><Camera size={15} /> REAL MOMENTS. NATURALLY CAPTURED.</div>
                <div className="hero-index">01 <span>/</span> 03</div>
              </section>
      
              <section className="intro-strip">
                <div><span className="strip-label">A PERSONAL COLLECTION</span><h2>Small details. <em>Big stories.</em></h2></div>
                <p>Every photo is a reminder to slow down, observe, and appreciate the wild beauty around us.</p>
              </section>
      
              <section className="gallery-section" id="gallery">
                <div className="section-heading">
                  <div><span className="strip-label">THE PHOTO JOURNAL</span><h2>Captured <em>in nature</em></h2></div>
                  <div className="photo-count"><strong>{photoCount}</strong><span>PHOTOGRAPHS</span></div>
                </div>
      
                {isAdmin && (
                  <form className="upload-panel" onSubmit={uploadPhoto}>
                    <div className="upload-heading"><div className="upload-icon"><Upload size={20} /></div><div><h3>Add a new photograph</h3><p>JPG, PNG or WebP · up to {MAX_FILE_MB} MB</p></div></div>
                    <div className="upload-fields">
                      <label className="file-picker"> <Images size={18} /><span>{file ? file.name : 'Choose a photo'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
                      <input className="caption-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" maxLength={120} />
                      <button className="primary-button upload-button" disabled={busy} type="submit">{busy ? 'Please wait…' : 'Upload photo'} <Upload size={16} /></button>
                    </div>
                  </form>
                )}
      
                {error && <div className="message error-message">{error}</div>}
                {notice && <div className="message success-message">{notice}</div>}
      
                {!isSupabaseConfigured ? (
                  <div className="empty-state"><Leaf size={28} /><h3>Connect your gallery</h3><p>Follow the README setup instructions, then add your Supabase project keys in <code>.env.local</code>.</p></div>
                ) : loading ? (
                  <div className="empty-state"><div className="spinner" /><p>Loading photographs…</p></div>
                ) : photos.length === 0 ? (
                  <div className="empty-state"><Camera size={28} /><h3>Your story starts here</h3><p>No photographs yet. Admin can sign in and upload the first photo.</p></div>
                ) : (
                  <div className="photo-grid">
                    {photos.map((photo, index) => (
                      <article className={`photo-card photo-card-${index % 3}`} key={photo.id}>
                        <button className="photo-open" onClick={() => setSelected(photo)} aria-label={`Open ${photo.caption}`}>
                          <img src={photo.url} alt={photo.caption} loading="lazy" />
                          <span className="photo-hover"><span>View photograph ↗</span></span>
                        </button>
                        <div className="photo-meta"><div><span className="photo-category">WILDFRAME COLLECTION</span><h3>{photo.caption}</h3></div>
                          <div className="photo-actions">
                            <button className="small-action" title="Download photo" onClick={() => downloadPhoto(photo)}><ArrowDownToLine size={16} /></button>
                            {isAdmin && <button className="small-action delete-action" title="Delete photo" onClick={() => deletePhoto(photo)} disabled={busy}><Trash2 size={16} /></button>}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
      
              <section className="about-section" id="about">
                <div className="about-symbol"><Leaf size={32} /></div>
                <div><span className="strip-label">BEHIND THE LENS</span><h2>Finding wonder in the <em>ordinary.</em></h2></div>
                <p>WildFrame is a personal collection of nature as I see it — from the delicate lines of a spider web to the warm glow of a setting sun.</p>
              </section>
            </main>
      
            <footer className="footer"><a className="brand footer-brand" href="#home"><span className="brand-mark"><Leaf size={18} /></span><span>WILDFRAME<small>NATURE THROUGH MY LENS</small></span></a><span>Made with patience & a love for nature.</span><a href="#home">Back to top ↑</a></footer>
      
            {showLogin && (
              <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowLogin(false) }}>
                <div className="login-modal">
                  <button className="modal-close icon-button" onClick={() => setShowLogin(false)} aria-label="Close login"><X /></button>
                  <div className="login-symbol"><LockKeyhole size={22} /></div>
                  <span className="strip-label">PRIVATE ACCESS</span><h2>Admin <em>login</em></h2>
                  <p>Sign in to manage your photography collection.</p>
                  <form onSubmit={signIn}>
                    <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
                    <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
                    <button className="primary-button login-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'} <span>↗</span></button>
                  </form>
                  <small className="login-footnote">Admin accounts are created privately in Supabase. Public sign-up is not available.</small>
                </div>
              </div>
            )}
      
            {selected && (
              <div className="lightbox" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
                <button className="lightbox-close icon-button" onClick={() => setSelected(null)} aria-label="Close image"><X /></button>
                <img src={selected.url} alt={selected.caption} />
                <div className="lightbox-caption"><span>{selected.caption}</span><button className="small-action" onClick={() => downloadPhoto(selected)}><ArrowDownToLine size={17} /> Download</button></div>
              </div>
            )}
          </div>
        )
      }
      
      export default App
      