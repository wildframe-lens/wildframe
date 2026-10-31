import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { Camera, Leaf, LockKeyhole, LogOut, Upload, X, Trash2, ArrowDownToLine, Images, Menu, Instagram, Save, Flower, BarChart3, Users, Eye, TrendingUp } from 'lucide-react'

const BUCKET = 'wildframe-photos'
const MAX_FILE_MB = 8
const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/hex.satyam/'
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
  const [activeCategory, setActiveCategory] = useState('All')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactNote, setContactNote] = useState('')
  const [contactStatus, setContactStatus] = useState('')
  const [contactSending, setContactSending] = useState(false)
  const [instagramUrl, setInstagramUrl] = useState(DEFAULT_INSTAGRAM_URL)
  const [instagramInput, setInstagramInput] = useState(DEFAULT_INSTAGRAM_URL)
  const [analytics, setAnalytics] = useState({ visitors: 0, visits: 0, photoViews: 0, popularPhotos: [] })
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [showAllAnalyticsPhotos, setShowAllAnalyticsPhotos] = useState(false)

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

  async function loadInstagramSetting() {
    if (!isSupabaseConfigured) {
      setInstagramUrl(DEFAULT_INSTAGRAM_URL)
      setInstagramInput(DEFAULT_INSTAGRAM_URL)
      return
    }
    const { data } = await supabase
      .from('site_settings')
      .select('instagram_url')
      .eq('id', 1)
      .maybeSingle()
    const url = data?.instagram_url || DEFAULT_INSTAGRAM_URL
    setInstagramUrl(url)
    setInstagramInput(url)
  }

  async function saveInstagramSetting(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!isAdmin) return setError('Instagram link change karne ke liye Admin Login zaroori hai.')
    const value = instagramInput.trim()
    if (value && !/^https:\/\/(www\.)?instagram\.com\//i.test(value)) {
      return setError('Instagram ka valid profile URL daalein (https://www.instagram.com/username/).')
    }
    setBusy(true)
    const { error: saveError } = await supabase
      .from('site_settings')
      .upsert({ id: 1, instagram_url: value || null }, { onConflict: 'id' })
    setBusy(false)
    if (saveError) {
      setError('Instagram link save nahi hua. Supabase mein site_settings setup aur Admin UUID policy check karein.')
      return
    }
    setInstagramUrl(value)
    setNotice('Instagram link save ho gaya!')
  }

  function getVisitorId() {
    const key = 'wildframe_visitor_id'
    try {
      let id = window.localStorage.getItem(key)
      if (!id) {
        id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
        window.localStorage.setItem(key, id)
      }
      return id
    } catch {
      return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
  }

  async function recordAnalyticsEvent(eventType, photoId = null) {
    if (!isSupabaseConfigured) return
    try {
      await supabase.from('site_analytics').insert({
        visitor_id: getVisitorId(),
        event_type: eventType,
        photo_id: photoId
      })
    } catch (eventError) {
      // Analytics must never interrupt normal gallery use.
      console.debug('WildFrame analytics event was not recorded:', eventError)
    }
  }

  async function loadAnalytics() {
    if (!isAdmin || !isSupabaseConfigured) return
    setAnalyticsLoading(true)
    setAnalyticsError('')
    const { data, error: analyticsFetchError } = await supabase
      .from('site_analytics')
      .select('visitor_id, event_type, photo_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10000)
    if (analyticsFetchError) {
      setAnalyticsError('Analytics load nahi hua. Supabase mein analytics SQL setup check karein.')
      setAnalyticsLoading(false)
      return
    }
    const rows = data || []
    const visitorIds = new Set(rows.filter((row) => row.event_type === 'visit').map((row) => row.visitor_id))
    const visits = rows.filter((row) => row.event_type === 'visit').length
    const photoRows = rows.filter((row) => row.event_type === 'photo_view' && row.photo_id != null)
    const counts = new Map()
    photoRows.forEach((row) => counts.set(String(row.photo_id), (counts.get(String(row.photo_id)) || 0) + 1))
    const photoNames = new Map(photos.map((photo) => [String(photo.id), photo.caption || 'Untitled photograph']))
    const popularPhotos = [...counts.entries()]
      .map(([id, views]) => ({ id, views, caption: photoNames.get(id) || `Photo #${id}` }))
      .sort((a, b) => b.views - a.views)
    setAnalytics({ visitors: visitorIds.size, visits, photoViews: photoRows.length, popularPhotos })
    setAnalyticsLoading(false)
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
    loadInstagramSetting()
    try {
      if (!window.sessionStorage.getItem('wildframe_visit_recorded')) {
        window.sessionStorage.setItem('wildframe_visit_recorded', '1')
        recordAnalyticsEvent('visit')
      }
    } catch { recordAnalyticsEvent('visit') }
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isAdmin) loadAnalytics()
  }, [isAdmin, photos.length])

  // Keep the browser's Back button inside the gallery while a photograph is open.
  const lightboxHistoryOpen = useRef(false)

  useEffect(() => {
    if (selected && !lightboxHistoryOpen.current) {
      window.history.pushState(
        { ...(window.history.state || {}), __wildframeLightbox: true },
        '',
        window.location.href
      )
      lightboxHistoryOpen.current = true
    } else if (!selected && lightboxHistoryOpen.current) {
      // Remove the temporary lightbox entry when the user closes it with the X button.
      lightboxHistoryOpen.current = false
      window.history.back()
    }
  }, [selected])

  useEffect(() => {
    const handlePopState = () => {
      if (lightboxHistoryOpen.current) {
        lightboxHistoryOpen.current = false
        setSelected(null)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && lightboxHistoryOpen.current) {
        setSelected(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const photoCount = useMemo(() => String(photos.length).padStart(2, '0'), [photos.length])
  const categories = ['All', 'Forests','Wildlife','Flowers','Landscapes']
  const categoryKeywords = {
    Forests: ['forest', 'woods', 'cedar', 'tree', 'woodland'],
    Wildlife: ['wildlife', 'fox', 'bird', 'deer', 'animal', 'owl', 'bear'],
   Flowers: ['flower', 'flowers', 'blossom', 'petal', 'bloom', 'rose', 'tulip', 'sunflower', 'lotus', 'daisy'],
    Landscapes: ['landscape', 'sunset', 'sunrise', 'sky', 'meadow', 'valley']
  }
  const visiblePhotos = activeCategory === 'All' ? photos : photos.filter((photo) => {
    const text = `${photo.caption || ''} ${photo.file_path || ''}`.toLowerCase()
    return categoryKeywords[activeCategory].some((keyword) => text.includes(keyword))
  })

  async function prepareContactNote(e) {
    e.preventDefault()
    setContactStatus('')
    setContactSending(true)
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_m2waixa',
          template_id: 'template_8tv5o7d',
          user_id: '2Da_2ra3_KVYaCwwH',
          template_params: {
            from_name: contactName.trim(),
            reply_to: contactEmail.trim(),
            message: contactNote.trim()
          }
        })
      })
      const resultText = await response.text()
      if (!response.ok) {
        throw new Error(resultText || 'EmailJS could not send the message.')
      }
      setContactStatus('Thank you! Your message has been sent successfully.')
      setContactName('')
      setContactEmail('')
      setContactNote('')
    } catch (err) {
      console.error('WildFrame contact form error:', err)
      const detail = String(err?.message || 'Unknown error').slice(0, 240)
      setContactStatus(`Message send nahi ho paya: ${detail}`)
    } finally {
      setContactSending(false)
    }
  }

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

 
function openPhoto(photo) {
  setSelected(photo)
  recordAnalyticsEvent('photo_view', photo.id)
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
          <a href="#gallery" onClick={() => setMobileMenu(false)}>Collection</a>
          <a href="#about" onClick={() => setMobileMenu(false)}>Our story</a>
          <a href="#contact" onClick={() => setMobileMenu(false)}>Leave a note</a>
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
                <div className="hero-index">01 <span>/</span> {photoCount}</div>
              </section>
      
              <section className="intro-strip" aria-label="WildFrame philosophy">
                <div><span className="strip-label">A PERSONAL COLLECTION</span><h2>Small details. <em>Big stories.</em></h2></div>
                <p>Every photo is a reminder to slow down, observe, and appreciate the wild beauty around us.</p>
                <div className="intro-signature"><span>MADE SLOWLY, IN THE PLACES THAT ASK US TO PAUSE.</span><em><i />No two mornings alike<i /></em></div>
              </section>

              <section className="quote-section" aria-label="A note about nature">
                <div className="quote-image" role="img" aria-label="Quiet river winding through a forest" />
                <p>“On patience, weather &amp; the long way home”</p>
              </section>
      
              <section className="gallery-section" id="gallery">
                <div className="section-heading">
                  <div><span className="strip-label">THE COLLECTION</span><h2>A world, <em>unhurried.</em></h2><p className="section-description">A growing field journal of places that make you feel a little smaller, and a little more at home.</p></div>
                  <div className="photo-count"><strong>{photoCount}</strong><span>PHOTOGRAPHS</span></div>
                </div>
      
                <div className="category-filters" role="group" aria-label="Filter photographs by category">
                  {categories.map((category) => <button key={category} type="button" className={activeCategory === category ? 'category-filter active' : 'category-filter'} onClick={() => setActiveCategory(category)}>{category}</button>)}
                </div>

                {isAdmin && (
                  <form className="upload-panel instagram-settings-panel" onSubmit={saveInstagramSetting}>
                    <div className="upload-heading"><div className="upload-icon"><Instagram size={20} /></div><div><h3>Instagram profile link</h3><p>Add your profile URL here; the footer icon will open it.</p></div></div>
                    <div className="instagram-setting-fields">
                      <input className="caption-input" type="url" value={instagramInput} onChange={(e) => setInstagramInput(e.target.value)} placeholder="https://www.instagram.com/your_username/" aria-label="Instagram profile URL" />
                      <button className="primary-button upload-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Instagram link'} <Save size={16} /></button>
                    </div>
                  </form>
                )}

                {isAdmin && (
                  <section className="upload-panel analytics-panel" aria-label="Private visitor analytics">
                    <div className="upload-heading">
                      <div className="upload-icon"><BarChart3 size={20} /></div>
                      <div><h3>Visitor Analytics</h3><p>Private dashboard · Only visible to the signed-in admin</p></div>
                      <button className="small-action analytics-refresh" type="button" onClick={loadAnalytics} title="Refresh analytics" aria-label="Refresh analytics"><TrendingUp size={16} /></button>
                    </div>
                    {analyticsError && <div className="message error-message">{analyticsError}</div>}
                    <div className="analytics-stats">
                      <div className="analytics-stat"><Users size={18} /><strong>{analyticsLoading ? '…' : analytics.visitors.toLocaleString()}</strong><span>UNIQUE VISITORS</span></div>
                      <div className="analytics-stat"><TrendingUp size={18} /><strong>{analyticsLoading ? '…' : analytics.visits.toLocaleString()}</strong><span>TOTAL VISITS</span></div>
                      <div className="analytics-stat"><Eye size={18} /><strong>{analyticsLoading ? '…' : analytics.photoViews.toLocaleString()}</strong><span>PHOTO VIEWS</span></div>
                    </div>
                    <div className="analytics-popular">
                      <div className="analytics-popular-heading">
                        <h4>Most viewed photographs</h4>
                        {analytics.popularPhotos.length > 5 && (
                          <button
                            className="small-action analytics-show-all"
                            type="button"
                            onClick={() => setShowAllAnalyticsPhotos((current) => !current)}
                          >
                            {showAllAnalyticsPhotos ? 'SHOW TOP 05 ' : `SHOW ALL (${analytics.popularPhotos.length})`}
                          </button>
                        )}
                      </div>
                      {analyticsLoading ? <p>Loading statistics…</p> : analytics.popularPhotos.length ? (showAllAnalyticsPhotos ? analytics.popularPhotos : analytics.popularPhotos.slice(0, 5)).map((photo, index) => (
                        <div className="analytics-photo-row" key={photo.id}>
                          <span className="analytics-rank">{String(index + 1).padStart(2, '0')}</span>
                          <span className="analytics-photo-name">{photo.caption}</span>
                          <strong>{photo.views.toLocaleString()} views</strong>
                        </div>
                      )) : <p>No photo views recorded yet.</p>}
                    </div>
                    <p className="analytics-note">Counts are anonymous. Unique visitors use a random browser ID; repeat visits are counted separately. Dashboard shows up to the latest 10,000 events.</p>
                  </section>
                )}

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
                ) : visiblePhotos.length === 0 ? (
                  <div className="empty-state"><Leaf size={28} /><h3>No photos in this category yet</h3><p>Try another category or choose All to see the full collection.</p></div>
                ) : (
                  <div className="photo-grid">
                    {visiblePhotos.map((photo, index) => (
                      <article className={`photo-card photo-card-${index % 3}`} key={photo.id}>
                        <button className="photo-open" onClick={() => openPhoto(photo)} aria-label={`Open ${photo.caption}`}>
                          <img src={photo.url} alt={photo.caption} loading="lazy" />
                          <span className="photo-hover"><span>𝕼𝖚𝖎𝖈𝖐 𝖁𝖎𝖊𝖜↗</span></span>
                        </button>
                        <div className="photo-meta"><div><span className="photo-category">{activeCategory === 'All' ? 'FIELD JOURNAL' : activeCategory.toUpperCase()}</span><h3>{photo.caption}</h3></div>
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
      
              <section className="story-section" id="about">
                <div className="story-visual"><div className="story-photo" role="img" aria-label="Sunlight filtering through a quiet cedar forest" /><span className="story-seal">KEEP CLOSE<br />TO THE WILD<br />LOOK LONGER</span><span className="story-outline" /></div>
                <div className="story-copy"><span className="strip-label">A SMALL INTRODUCTION</span><h2>For the <em>in-between</em> moments.</h2>
                  <p>WildFrame is a field journal for people who find something worth keeping in the quiet between destinations.</p>
                  <p>This independent project is devoted to the moods and details of the natural world: wind moving through cedar, the hush just before rain, and the brief stillness of a wild animal in its habitat.</p>
                  <p>The gallery is designed for photography that values patience, honest color, and the smaller details most people miss.</p>
                  <div className="story-signoff"><span /> <em>See you out there.</em></div>
                </div>
              </section>

              <section className="contact-section" id="contact">
                <div className="contact-intro"><span
  className="strip-label"
  style={{ letterSpacing: "0.02em", fontSize: "10px" }}
>
  LEAVE A FIELD NOTE
</span><h2>Have a place<br />in mind?</h2><p>Tell us about a trail, ask about a photograph, or send a little kindness our way. We read every note, slowly.</p>
                  <div className="contact-detail"><span>⌖</span> For wild places, wherever you find them</div><div className="contact-detail"><span>✉</span> Send a note directly from the website</div>
                </div>
                <form className="contact-form" onSubmit={prepareContactNote}>
                  <label>YOUR NAME<input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="How should we call you?" required /></label>
                  <label>EMAIL ADDRESS<input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" required /></label>
                  <label>YOUR NOTE<textarea value={contactNote} onChange={(e) => setContactNote(e.target.value)} placeholder="A question, a place you love, or just a hello..." rows={5} required /></label>
                  <button className="primary-button contact-submit" type="submit" disabled={contactSending}>{contactSending ? 'Sending…' : 'Send message'} <span>↗</span></button>
                  <small>Messages are submitted directly from this form. Please do not include passwords or sensitive information.</small>
                  {contactStatus && <p className="contact-status" role="status" aria-live="polite">{contactStatus}</p>}
                </form>
              </section>
            </main>
      
            <footer className="footer"><div className="footer-top"><a className="brand footer-brand" href="#home"><span className="footer-leaf"><Leaf size={23} /></span><span>wildframe</span></a><p>A field journal for the places that stay with us.</p></div><div className="footer-links"><div><span>FIND YOUR WAY</span><a href="#gallery">The collection</a><a href="#about">Our story</a><a href="#contact">Leave a note</a></div><div><span>FOLLOW THE TRAIL</span>{instagramUrl ? <a className="social-square" href={instagramUrl} target="_blank" rel="noreferrer noopener" aria-label="Open WildFrame Instagram profile"><Instagram size={20} /></a> : <span className="social-square social-square-empty" aria-label="Instagram link not set"><Instagram size={20} /></span>}</div></div><div className="footer-bottom"><span>© 2026 WildFrame · An independent field project</span><a href="#home">Back to the canopy ↑</a></div></footer>
      
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
      